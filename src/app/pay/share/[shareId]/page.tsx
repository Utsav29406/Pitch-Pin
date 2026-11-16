import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoPayButton } from "@/components/demo-pay-button";
import { db } from "@/lib/db";
import { hasRazorpay } from "@/lib/env";
import { isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";

export const metadata: Metadata = { title: "Pay your share", robots: { index: false } };

/** Squad pay link used when Razorpay isn't connected: stands in for a Razorpay payment link. */
export default function DemoPayPage({ params }: PageProps<"/pay/share/[shareId]">) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-10">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[20px] bg-secondary" />}>
        <Pay params={params} />
      </Suspense>
    </main>
  );
}

async function Pay({ params }: { params: PageProps<"/pay/share/[shareId]">["params"] }) {
  const { shareId } = await params;
  if (hasRazorpay) notFound();
  await connection();
  const share = await db().paymentShare.findUnique({
    where: { id: shareId },
    include: { booking: { include: { court: { include: { venue: { select: { name: true, slug: true } } } } } } },
  });
  if (!share) notFound();
  const b = share.booking;
  const live = b.status === "HELD" && b.holdExpiresAt > new Date();

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">{share.label}&apos;s share</p>
        <h1 className="text-3xl font-semibold">{b.court.venue.name}</h1>
        <p className="text-muted-foreground">
          {longDate(isoFromDate(b.date))} · {rangeLabel(b.startHour, b.endHour)} · {b.court.name}
        </p>
      </div>
      <div className="flex items-baseline justify-between rounded-2xl border bg-card px-5 py-4">
        <span className="text-muted-foreground">Your share</span>
        <span className="font-heading text-3xl font-semibold tabular">{rupees(share.amount)}</span>
      </div>
      {share.status === "PAID" ? (
        <p className="rounded-2xl border bg-card p-4 font-semibold">This share is already paid. See you on the pitch!</p>
      ) : share.status === "REFUNDED" || !live ? (
        <p className="rounded-2xl border bg-card p-4">
          This hold has ended, so the link no longer works. Ask the organiser to book again.{" "}
          <Link href={`/turf/${b.court.venue.slug}`} className="font-semibold text-primary underline">
            See the turf
          </Link>
        </p>
      ) : (
        <>
          <DemoPayButton shareId={share.id} label={`Pay ${rupees(share.amount)} (demo)`} />
          <p className="text-center text-xs text-muted-foreground">No money is charged.</p>
        </>
      )}
    </>
  );
}
