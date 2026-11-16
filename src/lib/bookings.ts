import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { sendEvent } from "@/inngest/client";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { sendBookingConfirmed } from "./mail";
import { appUrl, hasRazorpay, HOLD_MINUTES } from "./env";
import { dateOnly, isoFromDate, nextDays, slotInstant } from "./format";
import { priceForRange, splitAmount } from "./pricing";
import { razorpay } from "./razorpay";

export class BookingError extends Error {}

const MAX_HOURS = 4;
const BOOKABLE_DAYS = 14;

function bookingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "PP-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function buildShares(total: number, mode: "FULL" | "SPLIT", squadSize: number, userId: string) {
  if (mode === "FULL") return [{ label: "You", position: 0, amount: total, userId }];
  return splitAmount(total, squadSize).map((amount, i) => ({
    label: i === 0 ? "You" : `Player ${i + 1}`,
    position: i,
    amount,
    userId: i === 0 ? userId : null,
  }));
}

export type HoldInput = {
  courtId: string;
  date: string;
  startHour: number;
  endHour: number;
  mode: "FULL" | "SPLIT";
  squadSize: number;
};

/** Put a time-limited hold on consecutive hours. Fails if any hour is taken. */
export async function createHold(user: CurrentUser, input: HoldInput) {
  const { courtId, date, startHour, endHour, mode } = input;
  const squadSize = mode === "SPLIT" ? Math.min(22, Math.max(2, input.squadSize)) : 1;
  const now = new Date();

  if (!nextDays(BOOKABLE_DAYS, now).includes(date)) {
    throw new BookingError(`You can book up to ${BOOKABLE_DAYS} days ahead.`);
  }
  if (endHour <= startHour || endHour - startHour > MAX_HOURS) {
    throw new BookingError(`Pick between 1 and ${MAX_HOURS} consecutive hours.`);
  }
  if (slotInstant(date, startHour) <= now) {
    throw new BookingError("That slot has already started. Pick a later time.");
  }

  const court = await db().court.findUnique({ where: { id: courtId }, include: { venue: true } });
  if (!court) throw new BookingError("This court no longer exists.");
  if (startHour < court.venue.openHour || endHour > court.venue.closeHour) {
    throw new BookingError("The venue is closed at that time.");
  }

  // Release any lapsed holds on this court and day first, so their hours can be re-booked.
  const stale = await db().booking.findMany({
    where: { courtId, date: dateOnly(date), status: "HELD", holdExpiresAt: { lte: now } },
    select: { id: true },
  });
  for (const b of stale) await expireBooking(b.id);

  const amount = priceForRange(court, startHour, endHour);
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES[mode] * 60_000);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  try {
    const booking = await db().booking.create({
      data: {
        code: bookingCode(),
        userId: user.id,
        courtId,
        date: dateOnly(date),
        startHour,
        endHour,
        amount,
        mode,
        squadSize,
        holdExpiresAt,
        slots: { create: hours.map((hour) => ({ courtId, date: dateOnly(date), hour })) },
        shares: { create: buildShares(amount, mode, squadSize, user.id) },
      },
    });
    await sendEvent("booking/held", { bookingId: booking.id, holdExpiresAt: holdExpiresAt.toISOString() });
    return booking;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new BookingError("Someone just grabbed one of those hours. Pick another slot.");
    }
    throw err;
  }
}

/** Switch between paying in full and splitting, before anyone has paid. */
export async function changePaymentMode(user: CurrentUser, bookingId: string, mode: "FULL" | "SPLIT", squadSize: number) {
  const booking = await db().booking.findFirst({
    where: { id: bookingId, userId: user.id },
    include: { shares: true },
  });
  if (!booking || booking.status !== "HELD") throw new BookingError("This hold has ended.");
  if (booking.holdExpiresAt <= new Date()) throw new BookingError("This hold has ended.");
  if (booking.shares.some((s) => s.status !== "PENDING" || s.razorpayPaymentLinkId || s.paymentLinkUrl)) {
    throw new BookingError("Payment links have already gone out, so the split can't change.");
  }
  const size = mode === "SPLIT" ? Math.min(22, Math.max(2, squadSize)) : 1;
  const holdExpiresAt = new Date(booking.createdAt.getTime() + HOLD_MINUTES[mode] * 60_000);

  await db().$transaction([
    db().paymentShare.deleteMany({ where: { bookingId } }),
    db().booking.update({
      where: { id: bookingId },
      data: {
        mode,
        squadSize: size,
        holdExpiresAt,
        shares: { create: buildShares(booking.amount, mode, size, user.id) },
      },
    }),
  ]);
  if (holdExpiresAt > booking.holdExpiresAt) {
    await sendEvent("booking/held", { bookingId, holdExpiresAt: holdExpiresAt.toISOString() });
  }
}

/**
 * Create a payment link for every unpaid squad share: Razorpay links when keys are set,
 * otherwise demo links on this site (`origin` is the site's own URL).
 */
export async function createSquadPaymentLinks(user: CurrentUser, bookingId: string, origin = appUrl) {
  const booking = await db().booking.findFirst({
    where: { id: bookingId, userId: user.id, status: "HELD" },
    include: { shares: { orderBy: { position: "asc" } }, court: { include: { venue: true } } },
  });
  if (!booking) throw new BookingError("This hold has ended.");
  if (!hasRazorpay) {
    const links = [];
    for (const share of booking.shares) {
      if (share.userId === user.id || share.status !== "PENDING") continue;
      const url = `${origin}/pay/share/${share.id}`;
      if (share.paymentLinkUrl !== url) await db().paymentShare.update({ where: { id: share.id }, data: { paymentLinkUrl: url } });
      links.push({ label: share.label, url, amount: share.amount });
    }
    return { booking, links };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expireSec = Math.floor(booking.holdExpiresAt.getTime() / 1000);
  const links: { label: string; url: string; amount: number }[] = [];

  for (const share of booking.shares) {
    if (share.userId === user.id || share.status !== "PENDING") continue;
    let url: string | null = share.paymentLinkUrl;
    if (!url) {
      const link = await razorpay().paymentLink.create({
        amount: share.amount,
        currency: "INR",
        description: `${booking.court.venue.name} · ${booking.code} · ${share.label}`,
        reference_id: share.id,
        customer: { name: `${share.label} · ${booking.code}` },
        // Razorpay requires expiry at least 15 minutes out; otherwise the
        // webhook refunds any payment that lands after the hold ends.
        ...(expireSec - nowSec > 16 * 60 ? { expire_by: expireSec } : {}),
        reminder_enable: false,
        notify: { sms: false, email: false },
        notes: { shareId: share.id, bookingId: booking.id },
        callback_url: `${appUrl}/pay/thanks`,
        callback_method: "get",
      });
      await db().paymentShare.update({
        where: { id: share.id },
        data: { razorpayPaymentLinkId: link.id, paymentLinkUrl: link.short_url },
      });
      url = link.short_url;
    }
    links.push({ label: share.label, url, amount: share.amount });
  }
  return { booking, links };
}

/**
 * Record a captured payment against a share. Confirms the booking when the
 * last share is paid. If the hold already lapsed, the payment is refunded.
 * Safe to call more than once for the same payment.
 */
export async function markSharePaid(shareId: string, paymentId: string) {
  const share = await db().paymentShare.findUnique({ where: { id: shareId }, include: { booking: true } });
  if (!share || share.status !== "PENDING") return;

  const lapsed =
    share.booking.status === "EXPIRED" ||
    share.booking.status === "CANCELLED" ||
    (share.booking.status === "HELD" && share.booking.holdExpiresAt <= new Date());

  const updated = await db().paymentShare.updateMany({
    where: { id: shareId, status: "PENDING" },
    data: { status: "PAID", razorpayPaymentId: paymentId, paidAt: new Date() },
  });
  if (updated.count === 0) return;

  if (lapsed) {
    if (share.booking.status === "HELD") await expireBooking(share.bookingId);
    else await refundShare(shareId);
    return;
  }

  const pending = await db().paymentShare.count({ where: { bookingId: share.bookingId, status: "PENDING" } });
  if (pending > 0) return;

  const confirmed = await db().booking.updateMany({
    where: { id: share.bookingId, status: "HELD" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  if (confirmed.count === 1) {
    const b = share.booking;
    await sendEvent("booking/confirmed", {
      bookingId: b.id,
      startsAt: slotInstant(isoFromDate(b.date), b.startHour).toISOString(),
    });
    await sendBookingConfirmed(b.id);
  }
}

async function refundShare(shareId: string) {
  const share = await db().paymentShare.findUnique({ where: { id: shareId } });
  if (!share || share.status !== "PAID" || !share.razorpayPaymentId) return;
  if (share.razorpayPaymentId.startsWith("demo_")) {
    // Demo payment: no money moved, so just mark it refunded.
    await db().paymentShare.update({ where: { id: shareId }, data: { status: "REFUNDED", refundedAt: new Date() } });
    return;
  }
  if (!hasRazorpay) {
    console.warn("[refund] Razorpay not configured; refund manually:", share.razorpayPaymentId);
    return;
  }
  await razorpay().payments.refund(share.razorpayPaymentId, {
    amount: share.amount,
    speed: "normal",
    notes: { shareId: share.id, reason: "Booking hold expired before full payment" },
  });
  await db().paymentShare.update({ where: { id: shareId }, data: { status: "REFUNDED", refundedAt: new Date() } });
}

/**
 * Demo mode (no Razorpay keys): mark a share as paid without charging anyone.
 * `userId` is set when paying from checkout (must own the share); null for a shared pay link.
 */
export async function payShareDemo(shareId: string, userId: string | null) {
  if (hasRazorpay) throw new BookingError("This payment link no longer works. Pay from the checkout page instead.");
  const share = await db().paymentShare.findUnique({ where: { id: shareId }, include: { booking: true } });
  if (!share) throw new BookingError("This payment link isn't valid.");
  if (userId && share.userId !== userId) throw new BookingError("This share belongs to someone else.");
  if (share.status !== "PENDING") throw new BookingError("This share is already paid.");
  if (share.booking.status !== "HELD" || share.booking.holdExpiresAt <= new Date()) {
    throw new BookingError("The hold ended before payment. Ask the organiser to book again.");
  }
  await markSharePaid(shareId, `demo_${crypto.randomUUID()}`);
}

/** End a lapsed hold: free its hours, cancel open links, refund anyone who paid. */
export async function expireBooking(bookingId: string) {
  const now = new Date();
  const ended = await db().booking.updateMany({
    where: { id: bookingId, status: "HELD", holdExpiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  if (ended.count === 0) return false;

  await db().bookedSlot.deleteMany({ where: { bookingId } });
  const shares = await db().paymentShare.findMany({ where: { bookingId } });
  for (const s of shares) {
    if (s.status === "PAID") {
      await refundShare(s.id).catch((e) => console.error("[refund] failed", s.id, e));
    } else if (s.status === "PENDING" && s.razorpayPaymentLinkId && hasRazorpay) {
      await razorpay().paymentLink.cancel(s.razorpayPaymentLinkId).catch(() => {});
    }
  }
  return true;
}

/**
 * Admin: cancel a held or confirmed booking. Frees its hours, cancels open pay links and
 * refunds everyone who paid (demo payments are just marked refunded). Reminders skip it
 * because they only fire for CONFIRMED bookings.
 */
export async function cancelBooking(bookingId: string) {
  const done = await db().booking.updateMany({
    where: { id: bookingId, status: { in: ["HELD", "CONFIRMED"] } },
    data: { status: "CANCELLED" },
  });
  if (done.count === 0) throw new BookingError("This booking is already cancelled or expired.");
  await db().bookedSlot.deleteMany({ where: { bookingId } });
  const shares = await db().paymentShare.findMany({ where: { bookingId } });
  for (const s of shares) {
    if (s.status === "PAID") {
      await refundShare(s.id).catch((e) => console.error("[refund] failed", s.id, e));
    } else if (s.status === "PENDING" && s.razorpayPaymentLinkId && hasRazorpay) {
      await razorpay().paymentLink.cancel(s.razorpayPaymentLinkId).catch(() => {});
    }
  }
}

/** Safety-net sweep for holds whose Inngest timer never fired. */
export async function expireStaleHolds() {
  const stale = await db().booking.findMany({
    where: { status: "HELD", holdExpiresAt: { lte: new Date() } },
    select: { id: true },
    take: 200,
  });
  let count = 0;
  for (const b of stale) if (await expireBooking(b.id)) count++;
  return count;
}

export async function getBookingForUser(bookingId: string, userId: string) {
  return db().booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ userId }, { shares: { some: { userId } } }],
    },
    include: {
      shares: { orderBy: { position: "asc" } },
      court: { include: { venue: true } },
    },
  });
}
