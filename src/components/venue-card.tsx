import Link from "next/link";
import type { DaySummary } from "@/lib/availability";
import { hourLabel, rupees } from "@/lib/format";
import { isBookable, sportLabel, type VenueInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TurfPhoto } from "./turf-photo";

function liveTag(s: DaySummary | undefined, isToday: boolean, bookable: boolean) {
  if (!bookable) return { text: "Call to book", tone: "bg-gold-light" };
  if (!s || !s.hasOpen) return { text: isToday ? "Full for today" : "Fully booked", tone: "bg-muted-foreground" };
  if (s.eveningLeft > 0 && s.eveningLeft <= 4) return { text: `${s.eveningLeft} evening slot${s.eveningLeft === 1 ? "" : "s"} left`, tone: "bg-coral" };
  return { text: isToday ? "Open now" : "Slots open", tone: "bg-live" };
}

export function VenueCard({
  venue,
  from,
  summary,
  date,
  isToday,
  km,
}: {
  venue: VenueInfo;
  from: number | null;
  summary?: DaySummary;
  date: string;
  isToday: boolean;
  km?: number;
}) {
  const href = `/turf/${venue.slug}?date=${date}`;
  const bookable = isBookable(venue);
  const tag = liveTag(summary, isToday, bookable);
  // Prefer evening slots; fall back to the next ones available.
  const evening = summary?.openHours.filter((h) => h >= 17) ?? [];
  const chips = (evening.length ? evening : (summary?.openHours ?? [])).slice(0, 4);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[20px] border bg-card transition-shadow focus-within:ring-3 focus-within:ring-ring/40 hover:shadow-md">
      <TurfPhoto src={venue.photoUrl} alt="" sport={venue.sports[0]} className="h-28">
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0b1a11]/85 px-2.5 py-1 text-xs font-semibold text-[#f2f6ee]">
          <i className={cn("size-[7px] rounded-full", tag.tone)} aria-hidden="true" />
          {tag.text}
        </span>
        {venue.rating != null && (
          <span className="absolute top-3 right-3 rounded-lg bg-sun px-2 py-0.5 text-xs font-bold text-foreground">
            ★ {venue.rating.toFixed(1)}
          </span>
        )}
      </TurfPhoto>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] leading-snug font-semibold">
              {/* Stretched link: the whole card opens the venue, slot chips stay separately clickable. */}
              <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
                {venue.name}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {venue.area}
              {km !== undefined && ` · ${km < 1 ? "under 1" : km < 10 ? km.toFixed(1) : Math.round(km)} km`}
              {" · "}
              {venue.sports.map(sportLabel).join(", ")}
            </p>
          </div>
          {from != null && (
            <p className="shrink-0 text-right">
              <span className="block text-[11px] text-muted-foreground">from</span>
              <span className="font-heading text-lg font-semibold tabular">
                {rupees(from)}
                <span className="font-sans text-xs font-medium text-muted-foreground">/hr</span>
              </span>
            </p>
          )}
        </div>

        {!bookable ? (
          <p className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
            Not on PitchPin yet · call or visit to book
            <span className="shrink-0 font-semibold text-primary">Details →</span>
          </p>
        ) : chips.length > 0 ? (
          <ul className="relative z-10 mt-auto flex flex-wrap gap-1.5" aria-label={`Open times at ${venue.name}`}>
            {chips.map((h) => (
              <li key={h}>
                <Link
                  href={`${href}&hour=${h}`}
                  className="inline-flex h-9 items-center rounded-lg border px-2.5 text-xs font-semibold tabular hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {hourLabel(h)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-auto text-xs text-muted-foreground">No open slots on this day. Try another date.</p>
        )}
      </div>
    </article>
  );
}
