import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasDatabase } from "@/lib/env";
import { isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My bookings" };

export default function BookingsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="text-3xl font-semibold md:text-4xl">My bookings</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-[20px] bg-secondary" />}>
        <BookingList />
      </Suspense>
    </main>
  );
}

const statusStyle = {
  CONFIRMED: "bg-[#1e7a43]/12 text-[#1a6b3b]",
  HELD: "bg-sun/25 text-foreground",
  EXPIRED: "bg-secondary text-muted-foreground",
  CANCELLED: "bg-secondary text-muted-foreground",
} as const;

const statusText = { CONFIRMED: "Confirmed", HELD: "Awaiting payment", EXPIRED: "Hold ended", CANCELLED: "Cancelled" } as const;

async function BookingList() {
  const user = await requireUser("/bookings");
  if (!hasDatabase) {
    return <p className="rounded-2xl border bg-card p-6 text-muted-foreground">Connect your database to see bookings.</p>;
  }
  const bookings = await db().booking.findMany({
    where: { OR: [{ userId: user.id }, { shares: { some: { userId: user.id } } }] },
    include: { court: { include: { venue: true } } },
    orderBy: [{ date: "desc" }, { startHour: "desc" }],
    take: 50,
  });

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
        <p className="font-semibold">No bookings yet</p>
        <p className="text-muted-foreground">Find a turf near you and hold a slot. Your games will show up here.</p>
        <Link href="/turfs" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
          Explore turfs
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {bookings.map((b) => (
        <li key={b.id}>
          <Link
            href={b.status === "HELD" ? `/checkout/${b.id}` : `/bookings/${b.id}`}
            className="flex items-center gap-4 rounded-[18px] border bg-card p-4 hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-semibold">{b.court.venue.name}</p>
              <p className="text-sm text-muted-foreground tabular">
                {longDate(isoFromDate(b.date))} · {rangeLabel(b.startHour, b.endHour)} · {b.court.name}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", statusStyle[b.status])}>{statusText[b.status]}</span>
              <span className="text-sm font-semibold tabular">{rupees(b.amount)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
