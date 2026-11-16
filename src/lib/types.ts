export const SPORTS = [
  { id: "FOOTBALL", label: "Football" },
  { id: "BOX_CRICKET", label: "Box cricket" },
  { id: "PICKLEBALL", label: "Pickleball" },
  { id: "BADMINTON", label: "Badminton" },
  { id: "TENNIS", label: "Tennis" },
] as const;

export type Sport = (typeof SPORTS)[number]["id"];

export const sportLabel = (s: Sport) =>
  SPORTS.find((x) => x.id === s)?.label ?? s;

export type CourtInfo = {
  id: string;
  name: string;
  format: string;
  size: string | null;
  sport: Sport;
  basePrice: number; // paise
  peakPrice: number; // paise
  peakFromHour: number;
};

export type VenueInfo = {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  source: string | null;
  /** Set once a turf owner manages this venue. */
  ownerId?: string | null;
  approxPin: boolean;
  mapsQuery: string | null;
  /** Courts/prices are PitchPin's demo estimates; the turf hasn't joined. */
  demoPrices: boolean;
  amenities: string[];
  sports: Sport[];
  photoUrl: string | null;
  openHour: number;
  closeHour: number;
  courts: CourtInfo[];
};

/** Takes bookings on PitchPin (has courts). Otherwise it's a directory listing: call or visit to book. */
export const isBookable = (v: { courts: unknown[] }) => v.courts.length > 0;

type MapsVenue = { name: string; area: string; lat: number; lng: number; approxPin: boolean; source: string | null; mapsQuery?: string | null; ownerId?: string | null };

/**
 * Only trust our coordinates when the turf's owner placed the pin (or added the turf themselves).
 * Listing coordinates from public directories are often the area centre, so search Google by name instead:
 * it resolves to the actual business and its gate.
 */
const exactPin = (v: MapsVenue) => !v.approxPin && (v.ownerId != null || v.source == null);
const placeQuery = (v: MapsVenue) => encodeURIComponent(v.mapsQuery || `${v.name}, ${v.area}, Ahmedabad`);

/** Google Maps page for the turf. */
export const mapsUrl = (v: MapsVenue) =>
  `https://www.google.com/maps/search/?api=1&query=${exactPin(v) ? `${v.lat},${v.lng}` : placeQuery(v)}`;

/** Google Maps directions to the turf. */
export const directionsUrl = (v: MapsVenue) =>
  `https://www.google.com/maps/dir/?api=1&destination=${exactPin(v) ? `${v.lat},${v.lng}` : placeQuery(v)}`;

export type SlotStatus = "open" | "held" | "booked" | "past";

export type Slot = {
  hour: number;
  price: number; // paise
  peak: boolean;
  status: SlotStatus;
  /** Minutes left on someone else's hold. */
  heldMinutes?: number;
};
