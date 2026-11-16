import { connection } from "next/server";
import { Suspense } from "react";
import { CountUp } from "@/components/home/count-up";
import { HeroMatch } from "@/components/home/hero-match";
import { HeroSearch } from "@/components/home/search-bar";
import { CompactRow, HowItWorks, PartnerCta, SectionHead, SportTiles, SquadPromo } from "@/components/home/sections";
import { VenueCard } from "@/components/venue-card";
import { getDaySummaries } from "@/lib/availability";
import { nextDays } from "@/lib/format";
import type { VenueInfo } from "@/lib/types";
import { fromPrice, getVenues } from "@/lib/venues";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-10 lg:gap-20">
      {/* Floodlit hero: lights flicker on, a 5-a-side plays out on the right */}
      <section className="hero-night relative -mt-[66px] overflow-hidden pt-[66px] text-[#f2f6ee] md:-mt-[78px] md:pt-[78px]">
        <div className="hero-lamp hero-lamp-l" aria-hidden="true" />
        <div className="hero-lamp hero-lamp-r" aria-hidden="true" />
        <div className="hero-beam hero-beam-a" aria-hidden="true" />
        <div className="hero-beam hero-beam-b" aria-hidden="true" />
        <PitchLines />
        <div className="relative z-[3] mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-10 md:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:pt-20 lg:pb-16">
          <div className="flex min-w-0 flex-col items-start gap-5 lg:gap-6">
            <span className="hero-rise flex items-center gap-2 rounded-full border border-[#f2f6ee]/30 bg-[#f2f6ee]/10 px-3 py-1.5 text-sm backdrop-blur" style={{ animationDelay: "0.1s" }}>
              <span className="hero-dot" aria-hidden="true" />
              Ahmedabad&apos;s turf booking app
            </span>
            <h1 className="max-w-3xl text-[36px] leading-[1.04] font-semibold lg:text-6xl">
              <HeadlineWords />
            </h1>
            <p className="hero-rise max-w-xl text-base leading-relaxed text-[#f2f6ee]/80 lg:text-lg" style={{ animationDelay: "0.85s" }}>
              Every football, box cricket and court-sports turf in the city, on one map. Where a turf takes PitchPin bookings,
              hold your hours, split the bill with your squad and walk in with a QR.
            </p>
            <div className="hero-rise w-full" style={{ animationDelay: "1s" }}>
              <HeroSearch />
            </div>
            <Suspense fallback={<div className="h-14" />}>
              <HeroStats />
            </Suspense>
          </div>
          <HeroMatch />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 md:px-6 lg:gap-8">
        <SectionHead eyebrow="What are you playing?" title="Pick your game" center />
        <SportTiles />
      </section>

      <Suspense fallback={<TonightSkeleton />}>
        <Tonight />
      </Suspense>

      <HowItWorks />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:px-6">
        <SquadPromo />
        <PartnerCta />
      </section>
    </main>
  );
}

/** Real counts from the venue list (cached). */
async function HeroStats() {
  const venues = await getVenues();
  const stats = [
    [venues.length, venues.length === 1 ? "Turf listed" : "Turfs listed"],
    [new Set(venues.map((v) => v.area)).size, "Areas covered"],
    [new Set(venues.flatMap((v) => v.sports)).size, "Sports"],
  ] as const;
  return (
    <dl className="hero-rise mt-2 flex gap-9 lg:mt-4 lg:gap-14" style={{ animationDelay: "1.15s" }}>
      {stats.map(([n, label]) => (
        <div key={label}>
          <dd className="font-heading text-[32px] font-semibold lg:text-4xl">
            <CountUp to={n} />
          </dd>
          <dt className="text-sm text-[#f2f6ee]/70">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Today's live picks: carousel + compact list on phones, card grid on desktop. */
async function Tonight() {
  await connection(); // live availability for "today"
  const today = nextDays(1)[0];
  const venues = await getVenues();
  const summaries = await getDaySummaries(venues, today);

  const open = venues.filter((v) => summaries.get(v.id)?.hasOpen);
  const byRating = (a: VenueInfo, b: VenueInfo) => (b.rating ?? 0) - (a.rating ?? 0);
  // "Filling fast": few evening slots left. Falls back to the best-rated open turfs.
  const fillingFast = open
    .filter((v) => (summaries.get(v.id)?.eveningLeft ?? 99) <= 4)
    .sort((a, b) => summaries.get(a.id)!.eveningLeft - summaries.get(b.id)!.eveningLeft);
  const topRated = [...open].sort(byRating);

  let spotlight: VenueInfo[];
  let popular: VenueInfo[];
  let title: string;
  let eyebrow: string;
  if (open.length > 0) {
    const filling = fillingFast.length >= 3;
    spotlight = filling ? fillingFast : topRated;
    popular = topRated;
    title = filling ? "Filling fast tonight" : "Top rated tonight";
    eyebrow = "Open tonight";
  } else {
    // Nothing bookable on PitchPin today: show real turfs from across the city instead.
    const mixed = acrossAreas(venues);
    spotlight = mixed;
    popular = mixed.slice(6);
    title = "Turfs across Ahmedabad";
    eyebrow = "Find your ground";
  }

  if (venues.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <p className="rounded-2xl border bg-card p-6 text-muted-foreground">No turfs listed yet.</p>
      </section>
    );
  }

  return (
    <>
      {/* Phone */}
      <section className="flex flex-col gap-4 lg:hidden">
        <div className="px-4">
          <SectionHead title={title} href="/turfs" linkLabel="See all" />
        </div>
        <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          {spotlight.slice(0, 6).map((v) => (
            <li key={v.id} className="w-[80%] max-w-80 shrink-0 snap-start">
              <VenueCard venue={v} from={fromPrice(v)} summary={summaries.get(v.id)} date={today} isToday />
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 lg:hidden">
        <SectionHead title="Popular in Ahmedabad" href="/turfs" linkLabel="See all" />
        {popular.slice(0, 6).map((v) => (
          <CompactRow key={v.id} venue={v} summary={summaries.get(v.id)} date={today} />
        ))}
      </section>

      {/* Desktop */}
      <section className="mx-auto hidden w-full max-w-6xl flex-col gap-8 px-6 lg:flex">
        <SectionHead eyebrow={eyebrow} title={open.length > 0 && title !== "Filling fast tonight" ? "Featured turfs" : title} href="/turfs" />
        <div className="grid grid-cols-4 gap-5">
          {spotlight.slice(0, 8).map((v) => (
            <VenueCard key={v.id} venue={v} from={fromPrice(v)} summary={summaries.get(v.id)} date={today} isToday />
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Round-robin by area so the first cards cover different parts of the city.
 * Within an area, turfs with the fullest details (exact pin, address, more sports) come first.
 */
function acrossAreas(venues: VenueInfo[]) {
  const detail = (v: VenueInfo) => Number(!v.approxPin) * 2 + Number(!!v.address && !v.address.endsWith(", Ahmedabad")) + v.sports.length / 10;
  const ranked = [...venues].sort((a, b) => detail(b) - detail(a));
  const byArea = new Map<string, VenueInfo[]>();
  for (const v of ranked) byArea.set(v.area, [...(byArea.get(v.area) ?? []), v]);
  const lists = [...byArea.values()];
  const out: VenueInfo[] = [];
  for (let i = 0; out.length < venues.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

function TonightSkeleton() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 md:px-6 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-[20px] bg-secondary" />
      ))}
    </section>
  );
}

/** "Book the city's best turfs, in seconds." with each word rising in; "best turfs" gets a gold shine. */
function HeadlineWords() {
  const words: [string, boolean][] = [
    ["Book", false],
    ["the", false],
    ["city's", false],
    ["best", true],
    ["turfs", true],
  ];
  return (
    <>
      {words.map(([w, gold], i) => (
        <span key={w}>
          {gold ? (
            <em className="hero-word hero-shine" style={{ animationDelay: `${0.25 + i * 0.08}s, ${1.6 + i * 0.1}s` }}>
              {w}
            </em>
          ) : (
            <span className="hero-word" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
              {w}
            </span>
          )}
          {w === "turfs" ? "," : ""}{" "}
        </span>
      ))}
      <span className="hero-word" style={{ animationDelay: "0.65s" }}>
        in
      </span>{" "}
      <span className="hero-word" style={{ animationDelay: "0.73s" }}>
        seconds.
      </span>
    </>
  );
}

function PitchLines() {
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" fill="none" stroke="rgba(242,246,238,.08)" strokeWidth="3">
      <rect x="60" y="60" width="1320" height="520" />
      <path d="M720 60v520" />
      <circle cx="720" cy="320" r="110" />
      <rect x="60" y="180" width="150" height="280" />
      <rect x="1230" y="180" width="150" height="280" />
    </svg>
  );
}
