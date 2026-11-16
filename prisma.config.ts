import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Same precedence as Next.js in development; `vercel env pull` writes .env.development.local.
config({ path: [".env.development.local", ".env.local", ".env"], quiet: true });

// Migrations use Neon's direct (unpooled) connection.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
