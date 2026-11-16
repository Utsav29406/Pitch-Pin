import { z } from "zod";
import { AREAS } from "./areas";
import { SPORTS } from "./types";

// Shared by the owner form (browser) and the save action (server).

export const AMENITIES = [
  "Floodlights",
  "Parking",
  "Drinking water",
  "Washroom",
  "Changing room",
  "Cafe",
  "Equipment on rent",
  "First aid",
] as const;

export const FORMATS: Record<(typeof SPORTS)[number]["id"], string[]> = {
  FOOTBALL: ["5-a-side", "6-a-side", "7-a-side", "9-a-side"],
  BOX_CRICKET: ["Box cricket", "Box cricket (6 players)", "Box cricket (8 players)"],
  PICKLEBALL: ["Pickleball"],
  BADMINTON: ["Badminton · wooden", "Badminton · synthetic"],
  TENNIS: ["Tennis · hard court", "Tennis · clay"],
};

const sportIds = SPORTS.map((s) => s.id) as [string, ...string[]];
const areaNames = AREAS.map((a) => a.name) as [string, ...string[]];

const rupeesField = z.coerce
  .number({ error: "Enter a price in rupees." })
  .int("Use whole rupees.")
  .min(100, "At least ₹100 an hour.")
  .max(20000, "At most ₹20,000 an hour.");

export const courtSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Name this court, e.g. Turf A.").max(40),
    sport: z.enum(sportIds),
    format: z.string().trim().min(1, "Pick a format.").max(40),
    size: z.string().trim().max(30).optional(),
    basePrice: rupeesField,
    peakPrice: rupeesField,
    peakFromHour: z.coerce.number().int().min(0).max(23),
  })
  .refine((c) => c.peakPrice >= c.basePrice, { message: "Peak price can't be lower than the normal price.", path: ["peakPrice"] });

export const turfSchema = z
  .object({
    slug: z.string().optional(),
    name: z.string().trim().min(3, "Enter your turf's name.").max(80),
    area: z.enum(areaNames, { error: "Pick the area your turf is in." }),
    address: z.string().trim().min(8, "Enter the street address or a landmark.").max(200),
    lat: z.number().min(22.8, "Place the pin in Ahmedabad.").max(23.4, "Place the pin in Ahmedabad."),
    lng: z.number().min(72.3, "Place the pin in Ahmedabad.").max(72.9, "Place the pin in Ahmedabad."),
    openHour: z.coerce.number().int().min(0).max(23),
    closeHour: z.coerce.number().int().min(1).max(24),
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
    courts: z.array(courtSchema).min(1, "Add at least one court.").max(20, "Up to 20 courts."),
  })
  .refine((t) => t.closeHour > t.openHour, { message: "Closing time must be after opening time.", path: ["closeHour"] })
  .refine((t) => new Set(t.courts.map((c) => c.name.toLowerCase())).size === t.courts.length, {
    message: "Give every court a different name.",
    path: ["courts"],
  });

export type TurfInput = z.input<typeof turfSchema>;
export type CourtInput = z.input<typeof courtSchema>;

export const claimSchema = z.object({
  slug: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  role: z.enum(["Owner", "Manager", "Staff"]),
  message: z.string().trim().max(500).optional(),
});

export type ClaimInput = z.input<typeof claimSchema>;
