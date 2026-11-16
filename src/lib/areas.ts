// Ahmedabad localities used for "near" sorting. Coordinates are approximate area centres.
export const AREAS = [
  { slug: "bopal", name: "Bopal", lat: 23.0333, lng: 72.4667 },
  { slug: "south-bopal", name: "South Bopal", lat: 23.018, lng: 72.47 },
  { slug: "shela", name: "Shela", lat: 23.001, lng: 72.458 },
  { slug: "mumatpura", name: "Mumatpura", lat: 23.01, lng: 72.485 },
  { slug: "makarba", name: "Makarba", lat: 23.002, lng: 72.498 },
  { slug: "ambli", name: "Ambli", lat: 23.025, lng: 72.492 },
  { slug: "sindhu-bhavan", name: "Sindhu Bhavan Road", lat: 23.045, lng: 72.499 },
  { slug: "shilaj", name: "Shilaj", lat: 23.054, lng: 72.478 },
  { slug: "bodakdev", name: "Bodakdev", lat: 23.042, lng: 72.51 },
  { slug: "thaltej", name: "Thaltej / SG Highway", lat: 23.0505, lng: 72.517 },
  { slug: "prahlad-nagar", name: "Prahlad Nagar", lat: 23.012, lng: 72.5108 },
  { slug: "satellite", name: "Satellite", lat: 23.0275, lng: 72.525 },
  { slug: "vastrapur", name: "Vastrapur", lat: 23.039, lng: 72.529 },
  { slug: "science-city", name: "Science City", lat: 23.079, lng: 72.493 },
  { slug: "sola", name: "Sola", lat: 23.078, lng: 72.522 },
  { slug: "memnagar", name: "Memnagar", lat: 23.05, lng: 72.537 },
  { slug: "naranpura", name: "Naranpura", lat: 23.06, lng: 72.556 },
  { slug: "gota", name: "Gota", lat: 23.103, lng: 72.541 },
  { slug: "vaishno-devi", name: "Vaishno Devi Circle", lat: 23.135, lng: 72.542 },
  { slug: "koba-zundal", name: "Koba / Zundal", lat: 23.135, lng: 72.59 },
  { slug: "navrangpura", name: "Navrangpura", lat: 23.037, lng: 72.56 },
  { slug: "paldi", name: "Paldi", lat: 23.013, lng: 72.562 },
  { slug: "chandkheda", name: "Chandkheda", lat: 23.11, lng: 72.585 },
  { slug: "motera", name: "Motera", lat: 23.095, lng: 72.595 },
  { slug: "maninagar", name: "Maninagar", lat: 22.996, lng: 72.6 },
  { slug: "narol", name: "Narol", lat: 22.968, lng: 72.588 },
  { slug: "aslali", name: "Aslali", lat: 22.928, lng: 72.6 },
  { slug: "naroda", name: "Naroda", lat: 23.07, lng: 72.655 },
  { slug: "nikol", name: "Nikol", lat: 23.043, lng: 72.67 },
  { slug: "vastral", name: "Vastral", lat: 23.001, lng: 72.664 },
] as const;


export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Resolve ?near= to a point: an area slug, or "lat,lng" from the browser's location. */
export function resolveNear(near: string | undefined): { lat: number; lng: number; label: string } | null {
  if (!near) return null;
  const area = AREAS.find((a) => a.slug === near);
  if (area) return { lat: area.lat, lng: area.lng, label: area.name };
  const m = near.match(/^(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)$/);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng, label: "your location" };
  }
  return null;
}
