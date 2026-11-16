import { ArrowRight, CalendarCheck, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import type { DaySummary } from "@/lib/availability";
import { hourLabel, rupees } from "@/lib/format";
import { isBookable, SPORTS, sportLabel, type VenueInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TurfPhoto } from "../turf-photo";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold tracking-[0.14em] text-primary uppercase", className)}>{children}</p>;
}

export function SectionHead({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
  center,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  href?: string;
  linkLabel?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", center && "lg:flex-col lg:items-center lg:text-center")}>
      <div className="flex flex-col gap-1">
        {eyebrow && <Eyebrow className="hidden lg:block">{eyebrow}</Eyebrow>}
        <h2 className="text-2xl font-semibold lg:text-[34px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel}
          <ArrowRight className="hidden size-4 lg:block" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Round sport tiles — the "Explore by cuisine" row, for sports. */
export function SportTiles() {
  return (
    <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 lg:mx-0 lg:justify-center lg:gap-8 lg:px-0">
      {SPORTS.map((s) => (
        <li key={s.id} className="shrink-0">
          <Link href={`/turfs?sport=${s.id}`} className="group flex w-[72px] flex-col items-center gap-2 lg:w-32">
            <TurfPhoto
              alt=""
              sport={s.id}
              className="floodlit size-[72px] rounded-full ring-2 ring-card shadow-md transition-transform group-hover:scale-105 lg:size-32"
            />
            <span className="text-center text-xs leading-tight font-semibold lg:text-sm">{s.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Compact list row for phones: thumbnail, details, rating, time chips. */
export function CompactRow({ venue, summary, date }: { venue: VenueInfo; summary?: DaySummary; date: string }) {
  const href = `/turf/${venue.slug}?date=${date}`;
  const evening = summary?.openHours.filter((h) => h >= 17) ?? [];
  const chips = (evening.length ? evening : (summary?.openHours ?? [])).slice(0, 3);
  return (
    <article className="relative flex gap-3 rounded-2xl border bg-card p-2.5">
      <TurfPhoto alt="" sport={venue.sports[0]} className="floodlit size-[84px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate font-sans text-[15px] font-semibold">
            <Link href={href} className="after:absolute after:inset-0">
              {venue.name}
            </Link>
          </h3>
          {venue.rating != null && (
            <span className="shrink-0 text-xs font-bold">
              <span className="text-gold" aria-hidden="true">★</span> {venue.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {venue.sports.map(sportLabel).join(", ")} · {venue.area}
          {isBookable(venue) && ` · from ${rupees(Math.min(...venue.courts.map((c) => c.basePrice)))}`}
        </p>
        {!isBookable(venue) ? (
          <p className="text-xs text-muted-foreground">Not on PitchPin yet · call or visit to book</p>
        ) : chips.length > 0 ? (
          <ul className="relative z-10 flex gap-1.5">
            {chips.map((h) => (
              <li key={h}>
                <Link
                  href={`${href}&hour=${h}`}
                  className="inline-flex h-8 items-center rounded-lg border border-primary/60 px-2.5 text-xs font-semibold text-primary tabular hover:bg-primary hover:text-primary-foreground"
                >
                  {hourLabel(h)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Full today</p>
        )}
      </div>
    </article>
  );
}

const STEPS = [
  { icon: Search, title: "Find your turf", body: "Browse turfs by area, sport and price, with live open slots for today and the week ahead." },
  { icon: CalendarCheck, title: "Hold the slot", body: "Pick your hours and we hold them for you while you pay. No calls to the owner, no double bookings." },
  { icon: Users, title: "Split & play", body: "Pay in full or send each player a UPI link on WhatsApp. Show your QR at the gate and play." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="mb-6 flex flex-col items-center gap-1 text-center lg:mb-8">
        <Eyebrow>Simple as 1-2-3</Eyebrow>
        <h2 className="text-2xl font-semibold lg:text-[34px]">How PitchPin works</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-3 md:gap-5">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5 lg:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span aria-hidden="true" className="absolute top-3 right-5 font-heading text-5xl text-gold/25 italic">
              {i + 1}
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Dark promo: the squad split, our signature feature. */
export function SquadPromo() {
  return (
    <section className="hero-night relative overflow-hidden rounded-3xl p-6 text-[#f2f6ee] lg:p-10">
      <div className="relative flex max-w-xl flex-col items-start gap-3">
        <Eyebrow className="text-gold-light">Squad split</Eyebrow>
        <h2 className="text-[26px] leading-tight font-semibold lg:text-4xl">
          Nobody fronts the money. <em className="text-gold-light">Everyone pays their share.</em>
        </h2>
        <p className="text-[#f2f6ee]/80">
          Hold a slot for 30 minutes and send each player their own UPI payment link on WhatsApp. If the squad doesn&apos;t
          pay in time, everyone is refunded automatically.
        </p>
        <Link href="/turfs" className="mt-1 inline-flex h-11 items-center rounded-full bg-gold-light px-5 font-semibold text-night hover:brightness-105">
          Find a turf
        </Link>
      </div>
    </section>
  );
}

export function PartnerCta() {
  return (
    <Link href="/partner" className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-4 hover:shadow-sm lg:px-6">
      <span className="flex-1">
        <b>Own a turf?</b> <span className="text-muted-foreground">List it on PitchPin and fill your empty hours.</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
