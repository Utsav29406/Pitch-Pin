"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  BookingError,
  cancelHold,
  changePaymentMode,
  createHold,
  createSquadPaymentLinks,
  payShareDemo,
} from "@/lib/bookings";
import { db } from "@/lib/db";
import { hasDatabase } from "@/lib/env";
import { hourLabel, isoFromDate, longDate, rupees } from "@/lib/format";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needLogin?: boolean };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof BookingError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const holdSchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  mode: z.enum(["FULL", "SPLIT"]),
  squadSize: z.number().int().min(1).max(22),
});

export async function holdSlotsAction(input: z.infer<typeof holdSchema>): Promise<Result<{ bookingId: string }>> {
  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a slot first." };
  if (!hasDatabase) {
    return { ok: false, error: "Bookings aren't available right now. Please try again later." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to hold slots.", needLogin: true };
  try {
    const booking = await createHold(user, parsed.data);
    return { ok: true, bookingId: booking.id };
  } catch (err) {
    return fail(err);
  }
}

export async function changeModeAction(bookingId: string, mode: "FULL" | "SPLIT", squadSize: number): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    await changePaymentMode(user, bookingId, mode, squadSize);
    revalidatePath(`/checkout/${bookingId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Organiser cancels an unpaid hold from checkout. */
export async function cancelHoldAction(bookingId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    await cancelHold(user, bookingId);
    revalidatePath(`/checkout/${bookingId}`);
    revalidatePath("/bookings");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Payment links for the squad, plus a ready-made WhatsApp message. */
export async function squadLinksAction(bookingId: string): Promise<Result<{ message: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const origin = host ? `${proto}://${host}` : undefined;
    const { booking, links } = await createSquadPaymentLinks(user, bookingId, origin);
    const when = `${longDate(isoFromDate(booking.date))}, ${hourLabel(booking.startHour)}`;
    const message = [
      `Game on! ${booking.court.venue.name}, ${when}.`,
      `Pay your share before the hold runs out:`,
      ...links.map((l) => `${l.label} (${rupees(l.amount)}): ${l.url}`),
    ].join("\n");
    return { ok: true, message };
  } catch (err) {
    return fail(err);
  }
}

const prefsSchema = z.object({
  emailOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
});

export async function updatePrefsAction(input: z.infer<typeof prefsSchema>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await db().profile.update({ where: { id: user.id }, data: parsed.data });
  return { ok: true };
}

/** Demo payment from checkout (no Razorpay keys): pay your own share. */
export async function demoPayAction(shareId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    await payShareDemo(shareId, user.id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Demo payment from a squad pay link: anyone with the link can pay that share, like a real payment link. */
export async function demoPayLinkAction(shareId: string): Promise<Result> {
  try {
    await payShareDemo(shareId, null);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
