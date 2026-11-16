import { CalendarDays, CheckCircle2, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getOwnerDashboard } from "@/lib/owner";
import { sportLabel, type Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Owner dashboard", robots: { index: false } };

export default function OwnerPage({ searchParams }: PageProps<"/owner">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 md:px-6 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Your <em className="text-gold">turfs</em>
          </h1>
          <p className="text-muted-foreground">Add courts and prices, and see who&apos;s booked.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/owner/claim" className="inline-flex h-11 items-center gap-2 rounded-2xl border bg-card px-4 text-sm font-semibold hover:border-primary">
            <Search className="size-4" aria-hidden="true" /> Claim your listing
          </Link>
          <Link href="/owner/new" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" aria-hidden="true" /> Add a new turf
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[20px] bg-secondary" />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/owner">["searchParams"] }) {
  const user = await requireUser("/owner");
  const sp = await searchParams;
  await connection();
  const { venues, claims } = await getOwnerDashboard(user.id);
  const saved = typeof sp.saved === "string" ? venues.find((v) => v.slug === sp.saved) : undefined;

  return (
    <>
      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-live/40 bg-live/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          <span>
            <b>{saved.name}</b> is saved.{" "}
            <Link className="font-semibold text-primary underline" href={`/turf/${saved.slug}`}>
              See it as players do
            </Link>
          </span>
        </p>
      )}

      {venues.length === 0 && claims.length === 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Start
            href="/owner/claim"
            title="Your turf is already listed?"
            body="Most Ahmedabad turfs are already on PitchPin as listings. Find yours and claim it; once we check it's you, you can add courts and take bookings."
            cta="Find and claim it"
          />
          <Start
            href="/owner/new"
            title="Not listed yet?"
            body="Add your turf with its location, opening hours, courts and prices. It goes live straight away."
            cta="Add a new turf"
          />
        </section>
      ) : (
        <>
          {venues.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-2">
              {venues.map((v) => {
                const live = v.courts.length > 0;
                return (
                  <li key={v.id} className="flex flex-col gap-3 rounded-[20px] border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold">{v.name}</h2>
                        <p className="truncate text-sm text-muted-foreground">
                          {v.area}
                          {live && ` · ${v.courts.length} court${v.courts.length === 1 ? "" : "s"} · ${v.sports.map((s) => sportLabel(s as Sport)).join(", ")}`}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", live ? "bg-live/15 text-primary" : "bg-gold-light/30 text-gold")}>
                        {live ? "Taking bookings" : "Add courts"}
                      </span>
                    </div>
                    {live ? (
                      <p className="flex items-center gap-2 text-sm">
                        <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                        <b className="tabular">{v.upcoming}</b> upcoming booking{v.upcoming === 1 ? "" : "s"}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Players can find this turf but can&apos;t book it until you add courts and prices.</p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2">
                      <Link href={`/owner/turf/${v.slug}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                        <Pencil className="size-4" aria-hidden="true" /> {live ? "Edit & bookings" : "Add courts"}
                      </Link>
                      <Link href={`/turf/${v.slug}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold hover:border-primary">
                        <ExternalLink className="size-4" aria-hidden="true" /> View page
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {claims.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Your claims</h2>
              <ul className="flex flex-col gap-2">
                {claims.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3">
                    <span className="min-w-0">
                      <b>{c.venue.name}</b> <span className="text-sm text-muted-foreground">· {c.venue.area}</span>
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", c.status === "PENDING" ? "bg-gold-light/30 text-gold" : "bg-destructive/10 text-destructive")}>
                      {c.status === "PENDING" ? "Waiting for review" : "Not approved"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">We check claims by calling the number you gave. Approved turfs appear above.</p>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Start({ href, title, body, cta }: { href: string; title: string; body: string; cta: string }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-[20px] border bg-card p-6 hover:border-primary hover:shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{body}</p>
      <span className="mt-2 font-semibold text-primary">{cta} →</span>
    </Link>
  );
}
