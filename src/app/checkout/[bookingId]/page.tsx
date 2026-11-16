import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout-view";
import { requireUser } from "@/lib/auth";
import { getBookingForUser } from "@/lib/bookings";
import { hasRazorpay } from "@/lib/env";
import { isoFromDate } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage({ params }: PageProps<"/checkout/[bookingId]">) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="text-3xl font-semibold md:text-4xl">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
        <Checkout params={params} />
      </Suspense>
    </main>
  );
}

async function Checkout({ params }: { params: PageProps<"/checkout/[bookingId]">["params"] }) {
  const { bookingId } = await params;
  const user = await requireUser(`/checkout/${bookingId}`);
  const b = await getBookingForUser(bookingId, user.id);
  if (!b) notFound();
  if (b.status === "CONFIRMED") redirect(`/bookings/${b.id}`);

  return (
    <CheckoutView
      booking={{
        id: b.id,
        code: b.code,
        status: b.status,
        mode: b.mode,
        squadSize: b.squadSize,
        amount: b.amount,
        holdExpiresAt: b.holdExpiresAt.toISOString(),
        date: isoFromDate(b.date),
        startHour: b.startHour,
        endHour: b.endHour,
        venueName: b.court.venue.name,
        venueSlug: b.court.venue.slug,
        courtLabel: `${b.court.name} · ${b.court.format}`,
        isOrganiser: b.userId === user.id,
        linksSent: b.shares.some((s) => s.razorpayPaymentLinkId || s.paymentLinkUrl),
        demo: !hasRazorpay,
      }}
      shares={b.shares.map((s) => ({
        id: s.id,
        label: s.label,
        amount: s.amount,
        status: s.status,
        mine: s.userId === user.id,
      }))}
    />
  );
}
