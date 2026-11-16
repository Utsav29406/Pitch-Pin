import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DiscoverFilters } from "@/components/discover-filters";
import { VenueCard } from "@/components/venue-card";
import { distanceKm, resolveNear } from "@/lib/areas";
import { getDaySummaries } from "@/lib/availability";
import { hasDatabase } from "@/lib/env";
import { longDate, nextDays } from "@/lib/format";
import { SPORTS, type Sport } from "@/lib/types";
import { fromPrice, getVenues } from "@/lib/venues";

export const metadata: Metadata = {
  title: "Explore turfs",
  description: "Search every turf in Ahmedabad by area and sport, with directions and live slots where you can book online.",
};

export default function ExplorePage({ searchParams }: PageProps<"/turfs">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-5 md:px-6 md:pt-10">
      {!hasDatabase && (
        <p className="rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          Offline mode: showing the built-in turf list. Connect the database to take bookings.
        </p>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-3xl font-semibold lg:text-4xl">
          Explore <em className="text-gold">turfs</em>
        </h1>
        <p className="text-muted-foreground">Every turf in Ahmedabad, on one map.</p>
      </div>
      <Suspense fallback={<DiscoverSkeleton />}>
        <Discover searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Discover({ searchParams }: { searchParams: PageProps<"/turfs">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // "today" and live availability are per request

  const days = nextDays(7);
  const date = days.includes(one(sp.date) ?? "") ? one(sp.date)! : days[0];
  const isToday = date === days[0];
  const q = (one(sp.q) ?? "").trim();
  const sport = SPORTS.some((s) => s.id === one(sp.sport)) ? (one(sp.sport) as Sport) : null;
  const near = resolveNear(one(sp.near));
  const sortParam = one(sp.sort);
  const sort = sortParam === "price" || sortParam === "rating" ? sortParam : near ? "near" : "rating";

  const ql = q.toLowerCase();
  const all = await getVenues();
  const venues = all.filter(
    (v) =>
      (!sport || v.sports.includes(sport)) &&
      (!ql || v.name.toLowerCase().includes(ql) || v.area.toLowerCase().includes(ql) || v.address.toLowerCase().includes(ql)),
  );

  const summaries = await getDaySummaries(venues, date);
  const rows = venues.map((v) => ({
    venue: v,
    from: fromPrice(v),
    km: near ? distanceKm(near, v) : undefined,
    summary: summaries.get(v.id),
  }));
  rows.sort((a, b) => {
    // Turfs with free slots first, then the chosen order.
    const open = Number(!!b.summary?.hasOpen) - Number(!!a.summary?.hasOpen);
    if (open) return open;
    if (sort === "near") return (a.km ?? 0) - (b.km ?? 0);
    // Listings without a PitchPin price or rating go after the ones that have them.
    if (sort === "price") return (a.from ?? Infinity) - (b.from ?? Infinity);
    return (b.venue.rating ?? -1) - (a.venue.rating ?? -1) || a.venue.name.localeCompare(b.venue.name);
  });

  const heading = (
    <div className="min-w-0">
      <h2 className="text-xl font-semibold">
        {rows.length} {rows.length === 1 ? "turf" : "turfs"}
        {near ? ` near ${near.label}` : " in Ahmedabad"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {rows.some((r) => r.from != null)
          ? isToday
            ? "Open slots for today"
            : `Open slots for ${longDate(date)}`
          : "Call or visit to book. Online booking opens as turfs join PitchPin."}
      </p>
    </div>
  );

  return (
    <>
      <DiscoverFilters
        days={days}
        state={{ q, sport, date, near: one(sp.near) && near ? one(sp.near)! : null, sort }}
      />
      <section className="flex flex-col gap-3">
        {heading}
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-6">
            <p className="font-semibold">No turfs match</p>
            <p className="text-muted-foreground">Try another sport, area or search word.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-4">
            {rows.map((r) => (
              <VenueCard key={r.venue.id} venue={r.venue} from={r.from} summary={r.summary} date={date} isToday={isToday} km={r.km} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-11 w-48 animate-pulse rounded-full bg-secondary" />
      <div className="h-13 animate-pulse rounded-2xl bg-secondary" />
      <div className="h-10 animate-pulse rounded-full bg-secondary" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-60 animate-pulse rounded-[20px] bg-secondary" />
        ))}
      </div>
    </div>
  );
}
