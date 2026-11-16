import { ChevronLeft, ExternalLink } from "lucide-react";
import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TurfForm } from "@/components/owner/turf-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { isoFromDate, longDate, rangeLabel, rupees } from "@/lib/format";
import { getTurfBookings } from "@/lib/owner";
import { AREAS } from "@/lib/areas";
import { AMENITIES, FORMATS } from "@/lib/turf-schema";
import type { Sport } from "@/lib/types";

export const metadata: Metadata = { title: "Edit turf", robots: { index: false } };

export default function AdminEditTurfPage({ params }: PageProps<"/admin/turfs/[slug]">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/admin/turfs" className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border bg-card px-3.5 text-sm font-semibold">
        <ChevronLeft className="size-4" aria-hidden="true" /> All turfs
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
        <Manage params={params} />
      </Suspense>
    </div>
  );
}

async function Manage({ params }: { params: PageProps<"/admin/turfs/[slug]">["params"] }) {
  const { slug } = await params;
  const user = await requireAdmin(`/admin/turfs/${slug}`);
  await connection();
  const venue = await db().venue.findUnique({ where: { slug }, include: { courts: { orderBy: { name: "asc" } } } });
  if (!venue) notFound();
  const bookings = (await getTurfBookings(user, slug)) ?? [];

  // A claimed listing starts with the area centre and no courts: suggest a first court from its sports.
  const firstSport = (venue.sports[0] as Sport | undefined) ?? "FOOTBALL";
  const area = AREAS.some((a) => a.name === venue.area) ? venue.area : AREAS[0].name;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">{venue.name}</h2>
          <p className="text-muted-foreground">{venue.area}</p>
        </div>
        <a
          href={`${appUrl}/turf/${venue.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3.5 text-sm font-semibold hover:border-primary"
        >
          <ExternalLink className="size-4" aria-hidden="true" /> View on player site
        </a>
      </div>

      {venue.courts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Upcoming bookings</h2>
          {bookings.length === 0 ? (
            <p className="rounded-2xl border bg-card p-4 text-muted-foreground">No bookings yet. They appear here as soon as a squad books.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Court</th>
                    <th className="px-4 py-3 font-semibold">Player</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <b>{longDate(isoFromDate(b.date))}</b>
                        <br />
                        <span className="text-muted-foreground tabular">{rangeLabel(b.startHour, b.endHour)}</span>
                      </td>
                      <td className="px-4 py-3">{b.court.name}</td>
                      <td className="px-4 py-3">
                        {b.user.name ?? b.user.email}
                        {b.user.phone && <span className="block text-muted-foreground tabular">{b.user.phone}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {b.code}
                        {b.status === "HELD" && <span className="ml-1.5 rounded bg-gold-light/30 px-1.5 py-0.5 font-sans font-bold text-gold">Paying</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular">{rupees(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <TurfForm
        savedHref={`/admin/turfs?q=${encodeURIComponent(venue.name)}`}
        loginPath={`/admin/login?next=/admin/turfs/${venue.slug}`}
        initial={{
          slug: venue.slug,
          name: venue.name,
          area,
          address: venue.address.endsWith(", Ahmedabad") && venue.address.startsWith(venue.area) ? "" : venue.address,
          lat: venue.lat,
          lng: venue.lng,
          openHour: venue.openHour,
          closeHour: venue.closeHour,
          amenities: venue.amenities.filter((a): a is (typeof AMENITIES)[number] => (AMENITIES as readonly string[]).includes(a)),
          courts:
            venue.courts.length > 0
              ? venue.courts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  sport: c.sport,
                  format: c.format,
                  size: c.size ?? "",
                  basePrice: c.basePrice / 100,
                  peakPrice: c.peakPrice / 100,
                  peakFromHour: c.peakFromHour,
                }))
              : [{ name: "Court 1", sport: firstSport, format: FORMATS[firstSport][0], size: "", basePrice: 1000, peakPrice: 1400, peakFromHour: 18 }],
        }}
      />
    </>
  );
}
