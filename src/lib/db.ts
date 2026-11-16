import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull .env.development.local` to get the Neon connection string.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: strictSsl(connectionString) }) });
}

/** Neon URLs say sslmode=require; pg treats that as verify-full but warns. Say it explicitly. */
function strictSsl(url: string) {
  return url.replace(/sslmode=(require|prefer|verify-ca)/, "sslmode=verify-full");
}

/** Lazily created so demo mode (no DATABASE_URL) never touches Postgres. */
export function db(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}
