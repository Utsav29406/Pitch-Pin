import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushToUser } from "@/lib/notify";

const body = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad subscription." }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  await db().pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });
  // Confirm straight away, so people know notifications reach this device.
  await pushToUser(user.id, {
    title: "Notifications are on",
    body: "We'll remind you 30 minutes before kick-off, with directions and your entry QR.",
    url: "/bookings",
  });
  return NextResponse.json({ ok: true });
}
