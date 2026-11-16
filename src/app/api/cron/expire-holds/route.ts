import { NextResponse, type NextRequest } from "next/server";
import { expireStaleHolds } from "@/lib/bookings";
import { hasDatabase } from "@/lib/env";

/** Fallback sweep for Vercel Cron (see vercel.json). Inngest also runs one. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase) return NextResponse.json({ expired: 0 });
  const expired = await expireStaleHolds();
  return NextResponse.json({ expired });
}
