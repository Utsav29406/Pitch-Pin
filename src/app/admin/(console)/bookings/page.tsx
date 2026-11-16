import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { cancelBookingAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminSearch, FilterChips, one, pageOf, Pager } from "@/components/admin/list-tools";
import { StatusPill } from "@/components/admin/status-pill";
import { listBookings, type BookingFilter } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

const FILTERS: { value: BookingFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "held", label: "Being paid" },
  { value: "past", label: "Played" },
  { value: "cancelled", label: "Cancelled & expired" },
];

export default function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
      <Bookings searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookings({ searchParams }: { searchParams: PageProps<"/admin/bookings">["searchParams"] }) {
  await requireAdmin("/admin/bookings");
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const filter = (FILTERS.some((f) => f.value === one(sp.filter)) ? one(sp.filter) : "upcoming") as BookingFilter;
  const page = pageOf(sp.page);
  const { total, pages, rows } = await listBookings({ q, filter, page });

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <AdminSearch action="/admin/bookings" q={q} placeholder="Booking code, player email or turf" hidden={{ filter }} />
        <FilterChips base="/admin/bookings" current={filter} options={FILTERS} q={q} />
      </div>
      <p className="text-sm text-muted-foreground">
        {total} booking{total === 1 ? "" : "s"}
        {q && ` matching “${q}”`}
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Turf</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const paid = b.shares.filter((s) => s.status === "PAID").length;
              return (
                <tr key={b.id} className="border-b align-middle last:border-0">
                  <td className="px-4 py-3">
                    <b>{longDate(isoFromDate(b.date))}</b>
                    <span className="block text-muted-foreground tabular">{rangeLabel(b.startHour, b.endHour)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`${appUrl}/turf/${b.court.venue.slug}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                      {b.court.venue.name}
                    </a>
                    <span className="block text-muted-foreground">
                      {b.court.name} · <span className="font-mono text-xs">{b.code}</span>
                    </span>
                  </td>
                  <td className="max-w-56 truncate px-4 py-3">{b.user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {b.shares.some((s) => s.status === "REFUNDED")
                      ? "Refunded"
                      : b.mode === "SPLIT"
                        ? `Split · ${paid}/${b.shares.length} paid`
                        : paid
                          ? "Paid in full"
                          : "Full · unpaid"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{rupees(b.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(b.status === "CONFIRMED" || b.status === "HELD") && (
                      <ConfirmButton action={cancelBookingAction.bind(null, b.id)} label="Cancel" confirm="Cancel & refund?" done={`${b.code} cancelled and refunded`} danger />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No bookings here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/bookings" page={page} pages={pages} params={{ filter, ...(q && { q }) }} />
    </>
  );
}
