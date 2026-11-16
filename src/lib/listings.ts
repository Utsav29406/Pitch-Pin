import { AREAS } from "./areas";
import type { Sport, VenueInfo } from "./types";

// REAL turfs in Ahmedabad, collected from public listing pages (see `source` on each).
// They are directory listings: no courts, prices or ratings, so they can't be booked on
// PitchPin until the owner joins and adds courts. Used by prisma/seed.ts and offline mode.

type Row = {
  name: string;
  /** One of AREAS[].name (closest match), or the locality as written. */
  area: string;
  sports: Sport[];
  address: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  /** Google Maps search that lands on this exact turf, when name + area isn't enough. */
  mapsQuery?: string;
};

import rows from "./listings.json";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function areaCentre(area: string) {
  const a = area.toLowerCase();
  return (
    AREAS.find((x) => x.name.toLowerCase() === a) ??
    AREAS.find((x) => x.name.toLowerCase().includes(a) || a.includes(x.name.toLowerCase().split(" ")[0])) ??
    null
  );
}

function build(list: Row[]): VenueInfo[] {
  const used = new Set<string>();
  const perArea = new Map<string, number>();
  const out: VenueInfo[] = [];
  for (const r of list) {
    let slug = slugify(r.name);
    if (used.has(slug)) slug = `${slug}-${slugify(r.area)}`;
    if (used.has(slug)) continue; // duplicate listing
    used.add(slug);

    let lat = r.lat;
    let lng = r.lng;
    const approxPin = lat == null || lng == null;
    if (approxPin) {
      const c = areaCentre(r.area) ?? { lat: 23.03, lng: 72.55 };
      // Spread listings that share an area centre on a small ring (~300 m) so each pin stays tappable.
      const n = perArea.get(r.area) ?? 0;
      perArea.set(r.area, n + 1);
      const angle = n * 2.4;
      const radius = n === 0 ? 0 : 0.0028 + 0.0006 * Math.floor(n / 6);
      lat = c.lat + radius * Math.sin(angle);
      lng = c.lng + radius * Math.cos(angle);
    }

    out.push({
      id: `listing-${slug}`,
      slug,
      name: r.name,
      area: r.area,
      address: r.address ?? `${r.area}, Ahmedabad`,
      lat: lat!,
      lng: lng!,
      rating: null,
      source: r.source,
      mapsQuery: r.mapsQuery ?? null,
      approxPin,
      demoPrices: false,
      amenities: [],
      sports: r.sports,
      photoUrl: null,
      openHour: 6,
      closeHour: 24,
      courts: [],
    });
  }
  return out;
}

export const REAL_VENUES: VenueInfo[] = build(rows as Row[]);
