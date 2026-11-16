import { ChevronLeft, ExternalLink, MapPin, Navigation, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SlotPicker } from "@/components/slot-picker";
import { TurfPhoto } from "@/components/turf-photo";
import { nextDays } from "@/lib/format";
import { directionsUrl, isBookable, mapsUrl, sportLabel, type VenueInfo } from "@/lib/types";
import { getVenueBySlug, getVenues } from "@/lib/venues";

export async function generateStaticParams() {
  const venues = await getVenues();
  // Cache Components needs at least one entry; an unknown slug just renders the 404 page.
  return venues.length ? venues.map((v) => ({ slug: v.slug })) : [{ slug: "none" }];
}

export async function generateMetadata({ params }: PageProps<"/turf/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  return venue
    ? {
        title: venue.name,
        description: isBookable(venue)
          ? `Book ${venue.name}, ${venue.area}, Ahmedabad. Live slots and split payments.`
          : `${venue.name}, ${venue.area}, Ahmedabad: sports, location and directions.`,
      }
    : { title: "Turf not found" };
}

export default function VenuePage({ params, searchParams }: PageProps<"/turf/[slug]">) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 md:px-6 md:pt-8">
      <Link href="/turfs" className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold">
        <ChevronLeft className="size-4" aria-hidden="true" />
        All turfs
      </Link>
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-[20px] bg-secondary" />}>
        <VenueDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function VenueDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/turf/[slug]">["params"];
  searchParams: PageProps<"/turf/[slug]">["searchParams"];
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const initialDate = typeof sp.date === "string" ? sp.date : undefined;
  const hourNum = typeof sp.hour === "string" ? Number(sp.hour) : NaN;
  const initialHour = Number.isInteger(hourNum) && hourNum >= 0 && hourNum <= 23 ? hourNum : undefined;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  await connection(); // "today" must be computed per request
  const days = nextDays(7);

  return (
    <>
      <TurfPhoto src={venue.photoUrl} alt={venue.name} sport={venue.sports[0]} className="h-52 rounded-[20px] md:h-72" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold md:text-4xl">{venue.name}</h1>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {venue.address}
          </p>
        </div>
        {venue.rating != null && <span className="rounded-lg bg-sun px-2.5 py-1 text-sm font-bold">★ {venue.rating.toFixed(1)}</span>}
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Sports and amenities">
        {venue.sports.map((s) => (
          <li key={s} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            {sportLabel(s)}
          </li>
        ))}
        {venue.amenities.map((a) => (
          <li key={a} className="rounded-full border bg-card px-3 py-1.5 text-xs font-semibold">
            {a}
          </li>
        ))}
      </ul>
      {isBookable(venue) ? (
        <>
          <a
            className="w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline"
            href={directionsUrl(venue)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
          <SlotPicker slug={venue.slug} courts={venue.courts} days={days} initialDate={initialDate} initialHour={initialHour} />
        </>
      ) : (
        <ListingPanel venue={venue} />
      )}
    </>
  );
}

/** A real turf that doesn't take PitchPin bookings yet. */
function ListingPanel({ venue }: { venue: VenueInfo }) {
  const sourceHost = venue.source ? new URL(venue.source).hostname.replace(/^www\./, "") : null;
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border bg-card p-5 md:max-w-2xl md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Not on PitchPin yet</h2>
        <p className="text-muted-foreground">
          This turf doesn&apos;t take online bookings here yet. Call or visit to book; Google Maps has their phone number and
          opening hours.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={mapsUrl(venue)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Navigation className="size-4" aria-hidden="true" />
          Open in Google Maps
        </a>
        <Link href={`/owner/claim/${venue.slug}`} className="inline-flex h-12 items-center gap-2 rounded-2xl border bg-background px-5 font-semibold hover:border-primary">
          <Store className="size-4" aria-hidden="true" />
          Own this turf? Claim it
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        {venue.approxPin && "Map pin shows the area, not the exact gate. "}
        {sourceHost && venue.source && (
          <>
            Listing details from{" "}
            <a href={venue.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
              {sourceHost}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
            . Spot a mistake? Tell us from the owners page.
          </>
        )}
      </p>
    </section>
  );
}
