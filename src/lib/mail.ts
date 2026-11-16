import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";
import { appUrl, hasMail, hasResend, MAIL_FROM, RESEND_FROM } from "./env";
import { isoFromDate, longDate, rangeLabel, rupees } from "./format";

let transport: nodemailer.Transporter | null = null;
function mailer() {
  transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: MAIL_FROM, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transport;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Simple branded layout that renders in Gmail, Outlook and phone mail apps. */
function layout(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f3ead6;font-family:Arial,Helvetica,sans-serif;color:#13261a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ead6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf0;border:1px solid #e2d3b0;border-radius:18px;overflow:hidden">
<tr><td style="background:#0f2418;padding:18px 24px;font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#f2f6ee">Pitch<span style="color:#e9c46a">Pin</span></td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.2">${title}</h1>${body}</td></tr>
${cta ? `<tr><td style="padding:12px 24px 28px"><a href="${cta.href}" style="display:inline-block;background:#1e5a35;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px">${cta.label}</a></td></tr>` : ""}
<tr><td style="padding:16px 24px;border-top:1px solid #e2d3b0;font-size:12px;color:#5b6a5f">PitchPin · Turf booking in Ahmedabad · ${esc(appUrl.replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, text: string) {
  if (!hasMail) {
    console.info(`[mail] not configured, skipped "${subject}"`);
    return;
  }
  // Email is a nice-to-have: never fail a sign-up or booking because the mail service hiccupped.
  try {
    if (hasResend) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: RESEND_FROM, to: [to], reply_to: MAIL_FROM, subject, html, text }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "unknown error"}`);
      console.info(`[mail] sent "${subject}" via Resend (${body.id})`);
      return;
    }
    const info = await mailer().sendMail({ from: `PitchPin <${MAIL_FROM}>`, to, replyTo: MAIL_FROM, subject, html, text });
    console.info(`[mail] sent "${subject}" via Gmail (${info.messageId})`);
  } catch (err) {
    console.error("[mail] send failed:", subject, err);
  }
}

export function sendWelcome(email: string) {
  const p = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${t}</p>`;
  return send(
    email,
    "Welcome to PitchPin",
    layout(
      "You're on the team",
      p("Your PitchPin account is ready. Find a turf near you, hold your hours and split the bill with your squad.") +
        p("Box cricket, football, pickleball and more, across Ahmedabad."),
      { href: `${appUrl}/turfs`, label: "Find a turf" },
    ),
    `Your PitchPin account is ready. Find a turf: ${appUrl}/turfs`,
  );
}

export async function sendBookingConfirmed(bookingId: string) {
  const b = await db().booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { email: true } }, court: { select: { name: true, venue: { select: { name: true, area: true, address: true } } } } },
  });
  if (!b) return;
  const when = `${longDate(isoFromDate(b.date))} · ${rangeLabel(b.startHour, b.endHour)}`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#5b6a5f;font-size:14px;width:90px">${k}</td><td style="padding:6px 0;font-size:15px;font-weight:bold">${esc(v)}</td></tr>`;
  await send(
    b.user.email,
    `Booked: ${b.court.venue.name}, ${when}`,
    layout(
      "Your slot is booked",
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 8px">${row("Turf", b.court.venue.name)}${row("Court", b.court.name)}${row("When", when)}${row("Where", b.court.venue.address || b.court.venue.area)}${row("Paid", rupees(b.amount))}${row("Code", b.code)}</table>
       <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#5b6a5f">Show the QR on your ticket at the gate.</p>`,
      { href: `${appUrl}/bookings/${b.id}`, label: "Open ticket" },
    ),
    `Your slot is booked: ${b.court.venue.name}, ${when}. Code ${b.code}. Ticket: ${appUrl}/bookings/${b.id}`,
  );
}

/** Reminder 2 hours before kick-off. Skipped if the booking was cancelled or the player turned email reminders off. */
export async function sendBookingReminder(bookingId: string) {
  const b = await db().booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, emailOptIn: true } },
      court: { select: { name: true, venue: { select: { name: true, area: true, address: true } } } },
    },
  });
  if (!b || b.status !== "CONFIRMED" || !b.user.emailOptIn) return "skipped";
  const when = `${longDate(isoFromDate(b.date))} · ${rangeLabel(b.startHour, b.endHour)}`;
  const where = b.court.venue.address || b.court.venue.area;
  const p = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${t}</p>`;
  await send(
    b.user.email,
    `Kick-off in 2 hours: ${b.court.venue.name}`,
    layout(
      "Kick-off in 2 hours",
      p(`<b>${esc(b.court.venue.name)}</b> · ${esc(b.court.name)}<br>${esc(when)}<br>${esc(where)}`) +
        p(`Show the QR on your ticket at the gate. Booking code <b>${esc(b.code)}</b>.`),
      { href: `${appUrl}/bookings/${b.id}`, label: "Open ticket and directions" },
    ),
    `Kick-off in 2 hours: ${b.court.venue.name}, ${when}, ${where}. Code ${b.code}. Ticket: ${appUrl}/bookings/${b.id}`,
  );
  return "sent";
}
