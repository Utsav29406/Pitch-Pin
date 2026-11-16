import "server-only";
import { updateTag } from "next/cache";
import type { CurrentUser } from "./auth";
import { BookingError, cancelBooking } from "./bookings";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { dateOnly, nextDays } from "./format";

const PAGE = 50;

function assertAdmin(user: CurrentUser) {
  if (!user.isAdmin) throw new BookingError("Admins only.");
}

// ── Overview ────────────────────────────────────────────────────────────────

export async function getOverview() {
  const today = dateOnly(nextDays(1)[0]);
  const monthAgo = new Date(Date.now() - 30 * 86400_000);
  const confirmed = { status: "CONFIRMED" as const };
  const [players, owners, turfs, bookable, pendingClaims, upcoming, todayCount, month, recent, claims] = await Promise.all([
    db().profile.count(),
    db().venue.findMany({ where: { ownerId: { not: null } }, distinct: ["ownerId"], select: { ownerId: true } }),
    db().venue.count(),
    db().venue.count({ where: { courts: { some: {} } } }),
    db().venueClaim.count({ where: { status: "PENDING" } }),
    db().booking.count({ where: { ...confirmed, date: { gte: today } } }),
    db().booking.count({ where: { ...confirmed, date: today } }),
    db().booking.aggregate({ where: { ...confirmed, confirmedAt: { gte: monthAgo } }, _count: true, _sum: { amount: true } }),
    db().booking.findMany({
      where: { status: { in: ["CONFIRMED", "HELD"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { court: { select: { name: true, venue: { select: { name: true, slug: true } } } }, user: { select: { email: true } } },
    }),
    db().venueClaim.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { venue: { select: { name: true, area: true } }, user: { select: { email: true } } },
    }),
  ]);
  return {
    players,
    owners: owners.length,
    turfs,
    bookable,
    listings: turfs - bookable,
    pendingClaims,
    upcoming,
    todayCount,
    monthBookings: month._count,
    monthValue: month._sum.amount ?? 0,
    recent,
    claims,
  };
}

// ── Turfs ───────────────────────────────────────────────────────────────────

export type TurfFilter = "all" | "bookable" | "listing" | "owned";

export async function listTurfs({ q, filter, page }: { q: string; filter: TurfFilter; page: number }) {
  const where: Prisma.VenueWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { area: { contains: q, mode: "insensitive" } },
        { owner: { email: { contains: q, mode: "insensitive" } } },
      ],
    }),
    ...(filter === "bookable" && { courts: { some: {} } }),
    ...(filter === "listing" && { courts: { none: {} } }),
    ...(filter === "owned" && { ownerId: { not: null } }),
  };
  const [total, rows] = await Promise.all([
    db().venue.count({ where }),
    db().venue.findMany({
      where,
      orderBy: [{ ownerId: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        owner: { select: { email: true } },
        courts: { select: { id: true, basePrice: true, _count: { select: { bookings: true } } } },
      },
    }),
  ]);
  return {
    total,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    rows: rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      area: v.area,
      source: v.source,
      ownerEmail: v.owner?.email ?? null,
      courts: v.courts.length,
      fromPrice: v.courts.length ? Math.min(...v.courts.map((c) => c.basePrice)) : null,
      bookings: v.courts.reduce((n, c) => n + c._count.bookings, 0),
    })),
  };
}

/** Take a turf away from its owner. A claimed listing goes back to being claimable. */
export async function removeOwner(user: CurrentUser, venueId: string) {
  assertAdmin(user);
  const v = await db().venue.update({ where: { id: venueId }, data: { ownerId: null }, select: { slug: true } });
  await db().venueClaim.updateMany({ where: { venueId, status: "APPROVED" }, data: { status: "REJECTED", decidedAt: new Date() } });
  updateTag("venues");
  updateTag(`venue:${v.slug}`);
}

/** Delete a turf. Refused while it has any bookings, so nobody's history disappears. */
export async function deleteTurf(user: CurrentUser, venueId: string) {
  assertAdmin(user);
  const v = await db().venue.findUnique({
    where: { id: venueId },
    select: { slug: true, courts: { select: { _count: { select: { bookings: true } } } } },
  });
  if (!v) throw new BookingError("That turf is already gone.");
  if (v.courts.some((c) => c._count.bookings > 0)) throw new BookingError("This turf has bookings, so it can't be deleted.");
  await db().venue.delete({ where: { id: venueId } });
  updateTag("venues");
  updateTag(`venue:${v.slug}`);
}

// ── Bookings ────────────────────────────────────────────────────────────────

export type BookingFilter = "upcoming" | "held" | "past" | "cancelled";

export async function listBookings({ q, filter, page }: { q: string; filter: BookingFilter; page: number }) {
  const today = dateOnly(nextDays(1)[0]);
  const where: Prisma.BookingWhereInput = {
    ...(filter === "upcoming" && { status: "CONFIRMED", date: { gte: today } }),
    ...(filter === "held" && { status: "HELD" }),
    ...(filter === "past" && { status: "CONFIRMED", date: { lt: today } }),
    ...(filter === "cancelled" && { status: { in: ["CANCELLED", "EXPIRED"] } }),
    ...(q && {
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { court: { venue: { name: { contains: q, mode: "insensitive" } } } },
      ],
    }),
  };
  const [total, rows] = await Promise.all([
    db().booking.count({ where }),
    db().booking.findMany({
      where,
      orderBy: filter === "upcoming" ? [{ date: "asc" }, { startHour: "asc" }] : [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        court: { select: { name: true, venue: { select: { name: true, slug: true } } } },
        user: { select: { email: true } },
        shares: { select: { status: true } },
      },
    }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / PAGE)), rows };
}

export async function adminCancelBooking(user: CurrentUser, bookingId: string) {
  assertAdmin(user);
  await cancelBooking(bookingId);
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function listUsers({ q, page }: { q: string; page: number }) {
  const where: Prisma.ProfileWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
    : {};
  const [total, rows] = await Promise.all([
    db().profile.count({ where }),
    db().profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { bookings: true, ownedVenues: true } },
      },
    }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / PAGE)), rows };
}

export async function setAdmin(user: CurrentUser, profileId: string, isAdmin: boolean) {
  assertAdmin(user);
  if (profileId === user.id && !isAdmin) throw new BookingError("You can't remove your own admin access.");
  await db().profile.update({ where: { id: profileId }, data: { isAdmin } });
}
