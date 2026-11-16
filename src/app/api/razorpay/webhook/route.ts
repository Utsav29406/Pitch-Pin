import { NextResponse, type NextRequest } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { markSharePaid } from "@/lib/bookings";
import { db } from "@/lib/db";

type Entity = { id: string; reference_id?: string; notes?: Record<string, string> | unknown[] };
type WebhookBody = {
  event: string;
  payload: {
    payment?: { entity: Entity & { order_id?: string } };
    order?: { entity: Entity };
    payment_link?: { entity: Entity };
  };
};

const notesOf = (e?: Entity) =>
  e && e.notes && !Array.isArray(e.notes) ? (e.notes as Record<string, string>) : {};

/**
 * Razorpay webhook. Subscribe to: payment_link.paid, order.paid.
 * Idempotent: each event id is processed once, and markSharePaid ignores repeats.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !validateWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(raw) as WebhookBody;
  const eventId = request.headers.get("x-razorpay-event-id");
  if (eventId) {
    const seen = await db().webhookEvent.findUnique({ where: { id: eventId } });
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = body.payload.payment?.entity;
  let shareId: string | undefined;

  if (body.event === "payment_link.paid") {
    shareId = body.payload.payment_link?.entity.reference_id;
  } else if (body.event === "order.paid") {
    shareId = notesOf(body.payload.order?.entity).shareId ?? notesOf(payment).shareId;
    if (!shareId && payment?.order_id) {
      const share = await db().paymentShare.findUnique({ where: { razorpayOrderId: payment.order_id } });
      shareId = share?.id;
    }
  }

  if (shareId && payment?.id) await markSharePaid(shareId, payment.id);

  if (eventId) {
    await db().webhookEvent.create({ data: { id: eventId, type: body.event } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
