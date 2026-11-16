// Seeds the real Ahmedabad turf listings (src/lib/listings.json): `npx prisma db seed`.
// For the portfolio demo, every unclaimed listing also gets demo courts with typical Ahmedabad prices
// (marked demoPrices, shown as "Demo prices" in the app). Venues managed by an owner are never touched.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Sport } from "../src/generated/prisma/enums";
import { REAL_VENUES } from "../src/lib/listings";

/** Typical hourly rates in Ahmedabad (₹), off-peak and from 6 PM. */
const DEMO_COURT: Record<Sport, { name: string; format: string; base: number; peak: number; step: number }> = {
  FOOTBALL: { name: "Pitch 1", format: "5-a-side", base: 1200, peak: 1600, step: 100 },
  BOX_CRICKET: { name: "Box 1", format: "Box cricket", base: 1000, peak: 1400, step: 100 },
  PICKLEBALL: { name: "Pickleball 1", format: "Pickleball", base: 500, peak: 700, step: 50 },
  BADMINTON: { name: "Badminton 1", format: "Badminton · synthetic", base: 350, peak: 450, step: 50 },
  TENNIS: { name: "Tennis 1", format: "Tennis · hard court", base: 500, peak: 700, step: 50 },
};

/** Same small price nudge for a turf every time we seed, so turfs don't all cost the same. */
function nudge(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 4) - 1; // -1, 0, 1 or 2 steps
}

function demoCourts(slug: string, sports: Sport[]) {
  return (sports.length ? sports : (["BOX_CRICKET"] as Sport[])).map((sport) => {
    const d = DEMO_COURT[sport];
    const n = nudge(slug + sport) * d.step;
    return { name: d.name, sport, format: d.format, basePrice: (d.base + n) * 100, peakPrice: (d.peak + n) * 100, peakFromHour: 18 };
  });
}

config({ path: [".env.development.local", ".env.local", ".env"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! }),
});

async function main() {
  // 1. Remove the old SAMPLE venues, including any test bookings made on them.
  const sampleCourts = { court: { venue: { slug: { startsWith: "sample-" } } } };
  const bookings = await prisma.booking.deleteMany({ where: sampleCourts });
  const samples = await prisma.venue.deleteMany({ where: { slug: { startsWith: "sample-" } } });
  console.log(`Removed ${samples.count} sample venue(s) and ${bookings.count} test booking(s)`);

  // 2. Upsert real listings.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const { id: _id, courts: _courts, demoPrices: _demo, ...venue } of REAL_VENUES) {
    const existing = await prisma.venue.findUnique({ where: { slug: venue.slug }, select: { ownerId: true } });
    if (existing?.ownerId) continue; // claimed by its owner: their edits win
    await prisma.venue.upsert({ where: { slug: venue.slug }, create: venue, update: venue });
  }
  // 3. Drop listings that were removed from the file (unclaimed and never booked).
  const gone = await prisma.venue.deleteMany({
    where: {
      source: { not: null },
      ownerId: null,
      courts: { every: { bookings: { none: {} } } },
      slug: { notIn: REAL_VENUES.map((v) => v.slug) },
    },
  });
  console.log(`Seeded ${REAL_VENUES.length} real listing(s); removed ${gone.count} stale`);

  // 4. Demo courts for unclaimed listings that have none, so every turf can be booked in demo mode.
  const bare = await prisma.venue.findMany({ where: { ownerId: null, courts: { none: {} } }, select: { id: true, slug: true, sports: true } });
  for (const v of bare) {
    await prisma.venue.update({ where: { id: v.id }, data: { demoPrices: true, courts: { create: demoCourts(v.slug, v.sports) } } });
  }
  console.log(`Added demo courts to ${bare.length} turf(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
