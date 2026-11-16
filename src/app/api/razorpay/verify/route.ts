import { NextResponse, type NextRequest } from "next/server";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { markSharePaid } from "@/lib/bookings";
import { db } from "@/lib/db";

const body = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * Called by the browser right after Razorpay Checkout succeeds, so the UI
 * updates instantly. The webhook records the same payment as a backup.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad payment response." }, { status: 400 });
  const p = parsed.data;

  const valid = validatePaymentVerification(
    { order_id: p.razorpay_order_id, payment_id: p.razorpay_payment_id },
    p.razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET!,
  );
  if (!valid) return NextResponse.json({ error: "Payment signature didn't match." }, { status: 400 });

  const share = await db().paymentShare.findUnique({ where: { razorpayOrderId: p.razorpay_order_id } });
  if (!share) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  await markSharePaid(share.id, p.razorpay_payment_id);
  return NextResponse.json({ ok: true, bookingId: share.bookingId });
}
