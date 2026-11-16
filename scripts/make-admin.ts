// Give an account admin rights (review turf claims at /admin):
//   npm run make-admin -- you@example.com
// The account must exist: sign up on the site first.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.development.local", ".env.local", ".env"], quiet: true });

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! }),
});
prisma.profile
  .updateMany({ where: { email }, data: { isAdmin: true } })
  .then((r) => {
    if (r.count === 0) {
      console.error(`No account for ${email}. Sign up on the site first, then run this again.`);
      process.exitCode = 1;
    } else console.log(`${email} is now an admin. Open /admin to review claims.`);
  })
  .finally(() => prisma.$disconnect());
