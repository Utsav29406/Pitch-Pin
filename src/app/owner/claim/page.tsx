import { ChevronLeft, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sportLabel, type Sport } from "@/lib/types";

export const metadata: Metadata = { title: "Claim your turf", robots: { index: false } };

export default function ClaimSearchPage({ searchParams }: PageProps<"/owner/claim">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 md:px-6 md:pt-10">
      <Link href="/owner" className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold">
        <ChevronLeft className="size-4" aria-hidden="true" /> Your turfs
      </Link>
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Find your <em className="text-gold">turf</em>
        </h1>
        <p className="text-muted-foreground">Search by name or area, then claim it to start taking bookings.</p>
      </div>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[20px] bg-secondary" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/owner/claim">["searchParams"] }) {
  await requireUser("/owner/claim");
  await connection();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 60);
  const venues = q
    ? await db().venue.findMany({
        where: {
          ownerId: null,
          OR: [{ name: { contains: q, mode: "insensitive" } }, { area: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }],
        },
        orderBy: { name: "asc" },
        take: 30,
        select: { slug: true, name: true, area: true, address: true, sports: true },
      })
    : [];

  return (
    <>
      <form role="search" action="/owner/claim" className="flex h-13 items-center gap-2.5 rounded-2xl border bg-card px-4 focus-within:border-primary">
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="claim-q" className="sr-only">
          Turf name or area
        </label>
        <input id="claim-q" name="q" type="search" defaultValue={q} placeholder="e.g. Huddle Arena or Bopal" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none" autoFocus />
        <button type="submit" className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Search
        </button>
      </form>
      {q && venues.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-5">
          <p className="font-semibold">No unclaimed turf matches “{q}”.</p>
          <p className="text-muted-foreground">If your turf isn&apos;t listed, add it yourself. It takes about five minutes.</p>
          <Link href="/owner/new" className="font-semibold text-primary underline">
            Add a new turf
          </Link>
        </div>
      )}
      {venues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {venues.map((v) => (
            <li key={v.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{v.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {v.area} · {v.sports.map((s) => sportLabel(s as Sport)).join(", ")}
                </p>
              </div>
              <Link href={`/owner/claim/${v.slug}`} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                This is mine
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
