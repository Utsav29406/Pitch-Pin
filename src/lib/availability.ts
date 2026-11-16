import "server-only";
import { db } from "./db";
import { hasDatabase } from "./env";
import { dateOnly, slotInstant } from "./format";
import { priceForHour } from "./pricing";
import { REAL_VENUES } from "./listings";
import type { CourtInfo, Slot } from "./types";

type CourtWithHours = CourtInfo & { venue: { openHour: number; closeHour: number } };

async function loadCourt(courtId: string): Promise<CourtWithHours | null> {
  if (!hasDatabase) {
    for (const v of REAL_VENUES) {
      const c = v.courts.find((x) => x.id === courtId);
      if (c) return { ...c, venue: { openHour: v.openHour, closeHour: v.closeHour } };
    }
    return null;
  }
  const c = await db().court.findUnique({
    where: { id: courtId },
    include: { venue: { select: { openHour: true, closeHour: true } } },
  });
  return c as CourtWithHours | null;
}

export type DaySummary = {
  /** Start hours (in order) where at least one court is free, from now on. */
  openHours: number[];
  /** Free court-hours from 6 PM onwards. */
  eveningLeft: number;
  /** True when the venue still has at least one free hour on this date. */
  hasOpen: boolean;
};

/**
 * One query for every venue's free hours on a date — powers the home screen's
 * "3 slots left tonight" tags and next-slot chips.
 */
export async function getDaySummaries(
  venues: { id: string; openHour: number; closeHour: number; courts: { id: string }[] }[],
  isoDate: string,
  now = new Date(),
): Promise<Map<string, DaySummary>> {
  const courtIds = venues.flatMap((v) => v.courts.map((c) => c.id));
  const taken = new Set<string>(); // `${courtId}:${hour}`

  if (hasDatabase) {
    const rows = await db().bookedSlot.findMany({
      where: { courtId: { in: courtIds }, date: dateOnly(isoDate) },
      select: { courtId: true, hour: true, booking: { select: { status: true, holdExpiresAt: true } } },
    });
    for (const r of rows) {
      const { status, holdExpiresAt } = r.booking;
      if (status === "CONFIRMED" || (status === "HELD" && holdExpiresAt > now)) taken.add(`${r.courtId}:${r.hour}`);
    }
  } else {
    for (const id of courtIds) for (const h of [6, 7, 17, 19, 20]) taken.add(`${id}:${h}`);
  }

  const out = new Map<string, DaySummary>();
  for (const v of venues) {
    const openHours: number[] = [];
    let eveningLeft = 0;
    for (let hour = v.openHour; hour < v.closeHour; hour++) {
      if (slotInstant(isoDate, hour) <= now) continue;
      const free = v.courts.filter((c) => !taken.has(`${c.id}:${hour}`)).length;
      if (free > 0) openHours.push(hour);
      if (hour >= 18) eveningLeft += free;
    }
    out.set(v.id, { openHours, eveningLeft, hasOpen: openHours.length > 0 });
  }
  return out;
}

/** Hour-by-hour availability for one court on one IST date. Always fresh. */
export async function getAvailability(courtId: string, isoDate: string, now = new Date()) {
  const court = await loadCourt(courtId);
  if (!court) return null;

  const taken = new Map<number, { held: boolean; expiresAt: Date }>();

  if (hasDatabase) {
    const rows = await db().bookedSlot.findMany({
      where: { courtId, date: dateOnly(isoDate) },
      select: { hour: true, booking: { select: { status: true, holdExpiresAt: true } } },
    });
    for (const r of rows) {
      const { status, holdExpiresAt } = r.booking;
      // An expired hold that the background job hasn't cleaned yet counts as free.
      if (status === "HELD" && holdExpiresAt <= now) continue;
      if (status === "HELD" || status === "CONFIRMED") {
        taken.set(r.hour, { held: status === "HELD", expiresAt: holdExpiresAt });
      }
    }
  } else {
    // Demo mode: a few fixed taken hours so the grid looks realistic.
    for (const h of [6, 7, 17, 20]) taken.set(h, { held: false, expiresAt: now });
    taken.set(19, { held: true, expiresAt: new Date(now.getTime() + 4 * 60_000) });
  }

  const slots: Slot[] = [];
  for (let hour = court.venue.openHour; hour < court.venue.closeHour; hour++) {
    const t = taken.get(hour);
    const past = slotInstant(isoDate, hour) <= now;
    slots.push({
      hour,
      price: priceForHour(court, hour),
      peak: hour >= court.peakFromHour,
      status: past ? "past" : t ? (t.held ? "held" : "booked") : "open",
      heldMinutes: t?.held ? Math.max(1, Math.ceil((t.expiresAt.getTime() - now.getTime()) / 60_000)) : undefined,
    });
  }
  return { court, slots };
}
