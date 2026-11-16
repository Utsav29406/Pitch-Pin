import { Check, Navigation } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ReminderSettings } from "@/components/reminder-settings";
import { TicketQr } from "@/components/ticket-qr";
import { requireUser } from "@/lib/auth";
import { getBookingForUser } from "@/lib/bookings";
import { db } from "@/lib/db";
import { hourLabel, isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";
import { directionsUrl } from "@/lib/types";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

export default function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-6 md:pt-10">
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-[22px] bg-secondary" />}>
        <BookingDetail params={params} />
      </Suspense>
    </main>
  );
}

async function BookingDetail({ params }: { params: PageProps<"/bookings/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/bookings/${id}`);
  const b = await getBookingForUser(id, user.id);
  if (!b) notFound();
  if (b.status === "HELD") redirect(`/checkout/${b.id}`);

  const profile = await db().profile.findUnique({ where: { id: user.id } });
  const iso = isoFromDate(b.date);
  const venue = b.court.venue;
  const confirmed = b.status === "CONFIRMED";

  return (
    <>
      <div className="flex flex-col items-start gap-3">
        {confirmed && (
          <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-7" strokeWidth={2.6} aria-hidden="true" />
          </span>
        )}
        <h1 className="text-3xl font-semibold">
          {confirmed ? `You're on for ${longDate(iso).split(",")[0]}, ${hourLabel(b.startHour)}` : "This booking isn't active"}
        </h1>
        <p className="text-muted-foreground">
          {confirmed
            ? b.mode === "SPLIT"
              ? `All ${b.squadSize} players paid. Show this QR at the gate.`
              : "Paid in full. Show this QR at the gate."
            : "The hold ended before payment was complete. Any payments were refunded."}
        </p>
      </div>

      <article className="overflow-hidden rounded-[22px] border bg-card">
        <div className="flex flex-col gap-1 p-5">
          <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">Booking {b.code}</span>
          <p className="font-heading text-xl font-semibold">{venue.name}</p>
          <p className="text-sm text-muted-foreground">{venue.address}</p>
        </div>
        <div className="mx-5 border-t-2 border-dashed" />
        <dl className="grid grid-cols-2 gap-3 p-5">
          {[
            ["Date", longDate(iso)],
            ["Time", rangeLabel(b.startHour, b.endHour)],
            ["Court", `${b.court.name} · ${b.court.format}`],
            ["Paid", rupees(b.amount)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{k}</dt>
              <dd className="font-semibold tabular">{v}</dd>
            </div>
          ))}
        </dl>
        {confirmed && (
          <div className="flex items-center gap-4 px-5 pb-5">
            <TicketQr value={`TURFUP:${b.code}:${b.id}`} label={`Entry QR for booking ${b.code}`} />
            <p className="text-sm text-muted-foreground">Gate staff scan this to check you in.</p>
          </div>
        )}
      </article>

      <a
        href={directionsUrl(venue)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border bg-card font-semibold"
      >
        <Navigation className="size-4" aria-hidden="true" />
        Directions
      </a>

      {confirmed && profile && (
        <ReminderSettings initial={{ emailOptIn: profile.emailOptIn, pushOptIn: profile.pushOptIn }} />
      )}

      <p className="text-xs text-muted-foreground">
        To cancel, contact the turf or email teampitchpinn@gmail.com. If a booking is cancelled, every paid share is refunded to the original payment method. <a href="/terms#cancellations" className="font-semibold underline underline-offset-2">Cancellation terms</a>
      </p>
    </>
  );
}
