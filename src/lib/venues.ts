import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { hasDatabase } from "./env";
import { REAL_VENUES } from "./listings";
import type { VenueInfo } from "./types";

const venueInclude = { courts: { orderBy: { name: "asc" as const } } };

/** All venues. Cached; call revalidateTag("venues") after an owner edits one. */
export async function getVenues(): Promise<VenueInfo[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("venues");

  if (!hasDatabase) return REAL_VENUES;
  const rows = await db().venue.findMany({ include: venueInclude, orderBy: { name: "asc" } });
  return rows as VenueInfo[];
}

export async function getVenueBySlug(slug: string): Promise<VenueInfo | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("venues", `venue:${slug}`);

  if (!hasDatabase) return REAL_VENUES.find((v) => v.slug === slug) ?? null;
  const row = await db().venue.findUnique({ where: { slug }, include: venueInclude });
  return row as VenueInfo | null;
}

/** Lowest hourly price, or null for a listing that doesn't take PitchPin bookings. */
export function fromPrice(v: VenueInfo): number | null {
  return v.courts.length ? Math.min(...v.courts.map((c) => c.basePrice)) : null;
}
