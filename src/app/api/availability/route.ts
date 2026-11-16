import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/lib/availability";

const query = z.object({
  courtId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** The Firebase copy (pitchpin.web.app) reads live slots from here. Availability is public data. */
const COPY_ORIGINS = new Set(["https://pitchpin.web.app", "https://pitchpin.firebaseapp.com"]);
function cors(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  return origin && COPY_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
}

export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pass courtId and date (YYYY-MM-DD)." }, { status: 400, headers: cors(request) });
  }
  const result = await getAvailability(parsed.data.courtId, parsed.data.date);
  if (!result) return NextResponse.json({ error: "Court not found." }, { status: 404, headers: cors(request) });
  return NextResponse.json(
    { slots: result.slots },
    { headers: { "Cache-Control": "no-store", ...cors(request) } },
  );
}
