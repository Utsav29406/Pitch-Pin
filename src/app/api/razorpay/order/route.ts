import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasRazorpay } from "@/lib/env";
import { razorpay } from "@/lib/razorpay";

const body = z.object({ shareId: z.string().min(1) });

/** Create (or reuse) a Razorpay order for the signed-in user's share. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to pay." }, { status: 401 });
  if (!hasRazorpay) {
    return NextResponse.json({ error: "Payments aren't connected yet." }, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing shareId." }, { status: 400 });

  const share = await db().paymentShare.findUnique({
    where: { id: parsed.data.shareId },
    include: { booking: { include: { court: { include: { venue: true } } } } },
  });
  if (!share || share.userId !== user.id) {
    return NextResponse.json({ error: "Share not found." }, { status: 404 });
  }
  if (share.status !== "PENDING") {
    return NextResponse.json({ error: "This share is already paid." }, { status: 409 });
  }
  if (share.booking.status !== "HELD" || share.booking.holdExpiresAt <= new Date()) {
    return NextResponse.json({ error: "The hold ended. Pick your slot again." }, { status: 410 });
  }

  let orderId = share.razorpayOrderId;
  if (!orderId) {
    const order = await razorpay().orders.create({
      amount: share.amount,
      currency: "INR",
      receipt: share.id,
      notes: { shareId: share.id, bookingId: share.bookingId },
    });
    orderId = order.id;
    await db().paymentShare.update({ where: { id: share.id }, data: { razorpayOrderId: orderId } });
  }

  return NextResponse.json({
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
    orderId,
    amount: share.amount,
    currency: "INR",
    name: "PitchPin",
    description: `${share.booking.court.venue.name} · ${share.booking.code}`,
    email: user.email,
  });
}
