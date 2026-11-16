import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getOverview } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";
import { StatusPill } from "@/components/admin/status-pill";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { absolute: "Overview · PitchPin Admin" }, robots: { index: false } };

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin("/admin");
  await connection();
  const o = await getOverview();

  const tiles: { label: string; value: string; sub: string; href: string; alert?: boolean }[] = [
    { label: "Claims to review", value: String(o.pendingClaims), sub: o.pendingClaims ? "Call and approve" : "All clear", href: "/admin/claims", alert: o.pendingClaims > 0 },
    { label: "Upcoming bookings", value: String(o.upcoming), sub: `${o.todayCount} today`, href: "/admin/bookings" },
    {
      label: "Last 30 days",
      value: rupees(o.monthValue),
      sub: `${o.monthBookings} booking${o.monthBookings === 1 ? "" : "s"}`,
      href: "/admin/bookings?filter=past",
    },
    { label: "Turfs", value: String(o.turfs), sub: `${o.bookable} bookable · ${o.listings} listings`, href: "/admin/turfs" },
    { label: "Turf owners", value: String(o.owners), sub: "Manage at least one turf", href: "/admin/turfs?filter=owned" },
    { label: "Accounts", value: String(o.players), sub: "Players and owners", href: "/admin/users" },
  ];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className={cn(
                "flex h-full flex-col gap-1 rounded-[18px] border bg-card p-4 hover:border-primary md:p-5",
                t.alert && "border-gold/60 bg-gold-light/15",
              )}
            >
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t.label}</span>
              <span className="font-heading text-3xl font-semibold tabular md:text-4xl">{t.value}</span>
              <span className={cn("text-sm", t.alert ? "font-semibold text-gold" : "text-muted-foreground")}>{t.sub}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-sm font-semibold text-primary hover:underline">
              All bookings →
            </Link>
          </div>
          {o.recent.length === 0 ? (
            <p className="rounded-2xl border bg-card p-4 text-muted-foreground">No bookings yet. They appear here as soon as a player books a turf that takes bookings.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-2xl border bg-card">
              {o.recent.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <a href={`${appUrl}/turf/${b.court.venue.slug}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                      {b.court.venue.name}
                    </a>
                    <span className="block truncate text-muted-foreground">
                      {longDate(isoFromDate(b.date))} · {rangeLabel(b.startHour, b.endHour)} · {b.user.email}
                    </span>
                  </span>
                  <span className="font-semibold tabular">{rupees(b.amount)}</span>
                  <StatusPill status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Waiting for review</h2>
            <Link href="/admin/claims" className="text-sm font-semibold text-primary hover:underline">
              Claims →
            </Link>
          </div>
          {o.claims.length === 0 ? (
            <p className="rounded-2xl border bg-card p-4 text-muted-foreground">No claims waiting.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-2xl border bg-card">
              {o.claims.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <b>{c.venue.name}</b> <span className="text-muted-foreground">· {c.venue.area}</span>
                  <span className="block truncate text-muted-foreground">{c.user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
