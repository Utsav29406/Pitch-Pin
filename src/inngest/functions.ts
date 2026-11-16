import { expireBooking, expireStaleHolds } from "@/lib/bookings";
import { db } from "@/lib/db";
import { hourLabel } from "@/lib/format";
import { sendBookingReminder } from "@/lib/mail";
import { pushToUser } from "@/lib/notify";
import { inngest, type BookingConfirmedEvent, type BookingHeldEvent } from "./client";

/** Wait until a hold lapses, then release it (refunding anyone who paid). */
export const expireHold = inngest.createFunction(
  { id: "expire-hold", triggers: [{ event: "booking/held" }] },
  async ({ event, step }) => {
    const data = event.data as BookingHeldEvent;
    await step.sleepUntil("wait-for-hold-end", new Date(data.holdExpiresAt));
    // A later event may have extended the hold; expireBooking checks the current expiry.
    return step.run("expire-if-unpaid", () => expireBooking(data.bookingId));
  },
);

/** Every 5 minutes, release any hold whose timer was missed. */
export const sweepHolds = inngest.createFunction(
  { id: "sweep-expired-holds", triggers: [{ cron: "*/5 * * * *" }] },
  async ({ step }) => step.run("sweep", () => expireStaleHolds()),
);

/** Email 2 hours before kick-off, web push 30 minutes before. */
export const bookingReminders = inngest.createFunction(
  { id: "booking-reminders", triggers: [{ event: "booking/confirmed" }] },
  async ({ event, step }) => {
    const { bookingId, startsAt } = event.data as BookingConfirmedEvent;
    const start = new Date(startsAt).getTime();

    const load = () =>
      db().booking.findUnique({
        where: { id: bookingId },
        include: { user: true, court: { include: { venue: true } } },
      });

    await step.sleepUntil("two-hours-before", new Date(start - 2 * 3600_000));
    await step.run("email-reminder", () => sendBookingReminder(bookingId));

    await step.sleepUntil("thirty-minutes-before", new Date(start - 30 * 60_000));
    await step.run("push-reminder", async () => {
      const b = await load();
      if (!b || b.status !== "CONFIRMED" || !b.user.pushOptIn) return "skipped";
      await pushToUser(b.userId, {
        title: `Kick-off at ${hourLabel(b.startHour)}`,
        body: `${b.court.venue.name} · ${b.court.name}. Tap for directions and your entry QR.`,
        url: `/bookings/${b.id}`,
      });
      return "sent";
    });
  },
);

export const functions = [expireHold, sweepHolds, bookingReminders];
