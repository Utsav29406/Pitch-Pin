import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "turfup" });

export type BookingHeldEvent = { bookingId: string; holdExpiresAt: string };
export type BookingConfirmedEvent = { bookingId: string; startsAt: string };

/**
 * Send an event without failing the request if Inngest isn't reachable.
 * The /api/cron/expire-holds sweep is the safety net for missed hold expiries.
 */
export async function sendEvent(name: string, data: Record<string, unknown>) {
  try {
    await inngest.send({ name, data });
  } catch (err) {
    console.warn(`[inngest] could not send ${name}:`, (err as Error).message);
  }
}
