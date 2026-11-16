import "server-only";
import { updateTag } from "next/cache";
import type { CurrentUser } from "./auth";
import { BookingError } from "./bookings";
import { db } from "./db";
import { dateOnly, nextDays } from "./format";
import { claimSchema, turfSchema, type ClaimInput, type TurfInput } from "./turf-schema";
import type { Sport } from "./types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function uniqueSlug(name: string, area: string) {
  const base = slugify(name) || "turf";
  const tries = [base, `${base}-${slugify(area)}`];
  for (let n = 2; n < 50; n++) tries.push(`${base}-${n}`);
  for (const slug of tries) {
    if (!(await db().venue.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function refreshVenue(slug: string) {
  updateTag("venues");
  updateTag(`venue:${slug}`);
}

/** Create a new turf, or update one the user owns. Returns the slug. */
export async function saveTurf(user: CurrentUser, raw: TurfInput): Promise<string> {
  const parsed = turfSchema.safeParse(raw);
  if (!parsed.success) throw new BookingError(parsed.error.issues[0]?.message ?? "Check the form.");
  const t = parsed.data;
  const sports = [...new Set(t.courts.map((c) => c.sport as Sport))];
  const venueData = {
    name: t.name,
    area: t.area,
    address: t.address,
    lat: t.lat,
    lng: t.lng,
    approxPin: false,
    openHour: t.openHour,
    closeHour: t.closeHour,
    amenities: t.amenities,
    sports,
  };
  const courtData = (c: (typeof t.courts)[number]) => ({
    name: c.name,
    sport: c.sport as Sport,
    format: c.format,
    size: c.size || null,
    basePrice: c.basePrice * 100,
    peakPrice: c.peakPrice * 100,
    peakFromHour: c.peakFromHour,
  });

  if (!t.slug) {
    const slug = await uniqueSlug(t.name, t.area);
    await db().venue.create({
      data: { ...venueData, slug, ownerId: user.id, rating: null, courts: { create: t.courts.map(courtData) } },
    });
    refreshVenue(slug);
    return slug;
  }

  const venue = await db().venue.findUnique({
    where: { slug: t.slug },
    include: { courts: { include: { _count: { select: { bookings: true } } } } },
  });
  if (!venue || (venue.ownerId !== user.id && !user.isAdmin)) throw new BookingError("You can only edit turfs you manage.");

  const keep = new Set(t.courts.map((c) => c.id).filter(Boolean));
  for (const c of t.courts) {
    if (c.id && !venue.courts.some((x) => x.id === c.id)) throw new BookingError("That court isn't part of this turf.");
  }
  const removed = venue.courts.filter((c) => !keep.has(c.id));
  const booked = removed.find((c) => c._count.bookings > 0);
  if (booked) throw new BookingError(`${booked.name} has bookings, so it can't be removed. Change its details instead.`);

  await db().$transaction([
    db().court.deleteMany({ where: { id: { in: removed.map((c) => c.id) } } }),
    ...t.courts.filter((c) => c.id).map((c) => db().court.update({ where: { id: c.id }, data: courtData(c) })),
    db().venue.update({
      where: { id: venue.id },
      data: { ...venueData, demoPrices: false, courts: { create: t.courts.filter((c) => !c.id).map(courtData) } },
    }),
  ]);
  refreshVenue(venue.slug);
  return venue.slug;
}

/** Ask to manage an existing directory listing. An admin approves it. */
export async function claimListing(user: CurrentUser, raw: ClaimInput) {
  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) throw new BookingError(parsed.error.issues[0]?.message ?? "Check the form.");
  const c = parsed.data;
  const venue = await db().venue.findUnique({ where: { slug: c.slug }, select: { id: true, ownerId: true } });
  if (!venue) throw new BookingError("That turf isn't listed.");
  if (venue.ownerId === user.id) throw new BookingError("You already manage this turf.");
  if (venue.ownerId) throw new BookingError("Someone already manages this turf. If that's wrong, contact us.");
  const data = { phone: c.phone, role: c.role, message: c.message || null, status: "PENDING" as const, decidedAt: null };
  await db().venueClaim.upsert({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
    create: { ...data, venueId: venue.id, userId: user.id },
    update: data,
  });
}

/** Admin: approve or reject a claim. Approving hands the listing to the claimant. */
export async function decideClaim(user: CurrentUser, claimId: string, approve: boolean) {
  if (!user.isAdmin) throw new BookingError("Only admins can review claims.");
  const claim = await db().venueClaim.findUnique({ where: { id: claimId }, include: { venue: true } });
  if (!claim || claim.status !== "PENDING") throw new BookingError("This claim was already reviewed.");

  if (!approve) {
    await db().venueClaim.update({ where: { id: claimId }, data: { status: "REJECTED", decidedAt: new Date() } });
    return;
  }
  const taken = await db().venue.updateMany({ where: { id: claim.venueId, ownerId: null }, data: { ownerId: claim.userId } });
  if (taken.count === 0) throw new BookingError("Another owner was approved for this turf first.");
  await db().$transaction([
    db().venueClaim.update({ where: { id: claimId }, data: { status: "APPROVED", decidedAt: new Date() } }),
    db().venueClaim.updateMany({
      where: { venueId: claim.venueId, status: "PENDING", id: { not: claimId } },
      data: { status: "REJECTED", decidedAt: new Date() },
    }),
  ]);
  refreshVenue(claim.venue.slug);
}

export async function getOwnerDashboard(userId: string) {
  const today = dateOnly(nextDays(1)[0]);
  const [venues, claims] = await Promise.all([
    db().venue.findMany({
      where: { ownerId: userId },
      orderBy: { name: "asc" },
      include: {
        courts: { orderBy: { name: "asc" } },
      },
    }),
    db().venueClaim.findMany({
      where: { userId, status: { not: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      include: { venue: { select: { name: true, slug: true, area: true } } },
    }),
  ]);
  const upcoming = await db().booking.groupBy({
    by: ["courtId"],
    where: { court: { venue: { ownerId: userId } }, status: "CONFIRMED", date: { gte: today } },
    _count: true,
  });
  const perCourt = new Map(upcoming.map((u) => [u.courtId, u._count]));
  return {
    venues: venues.map((v) => ({ ...v, upcoming: v.courts.reduce((n, c) => n + (perCourt.get(c.id) ?? 0), 0) })),
    claims,
  };
}

/** Upcoming bookings at one turf, for its owner. */
export async function getTurfBookings(user: CurrentUser, slug: string) {
  const venue = await db().venue.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!venue || (venue.ownerId !== user.id && !user.isAdmin)) return null;
  const today = dateOnly(nextDays(1)[0]);
  return db().booking.findMany({
    where: { court: { venueId: venue.id }, date: { gte: today }, status: { in: ["CONFIRMED", "HELD"] } },
    orderBy: [{ date: "asc" }, { startHour: "asc" }],
    take: 100,
    include: {
      court: { select: { name: true } },
      user: { select: { email: true, name: true, phone: true } },
    },
  });
}
