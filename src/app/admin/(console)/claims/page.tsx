import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClaimDecision } from "@/components/owner/claim-decision";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Claims", robots: { index: false } };

export default function AdminClaimsPage() {
  return (
    <>
      <p className="text-muted-foreground">Call the number before approving: approving hands the listing to that account.</p>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[20px] bg-secondary" />}>
        <Claims />
      </Suspense>
    </>
  );
}

async function Claims() {
  await requireAdmin("/admin/claims");
  await connection();
  const [pending, recent] = await Promise.all([
    db().venueClaim.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { venue: { select: { name: true, slug: true, area: true, source: true } }, user: { select: { email: true } } },
    }),
    db().venueClaim.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: { venue: { select: { name: true } }, user: { select: { email: true } } },
    }),
  ]);

  return (
    <>
      {pending.length === 0 ? (
        <p className="rounded-2xl border bg-card p-5 text-muted-foreground">No claims waiting. Nice.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-[20px] border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`${appUrl}/turf/${c.venue.slug}`} target="_blank" rel="noreferrer" className="text-lg font-semibold hover:underline">
                    {c.venue.name}
                  </a>
                  <p className="text-sm text-muted-foreground">{c.venue.area}</p>
                </div>
                <ClaimDecision claimId={c.id} />
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="break-all">{c.user.email}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="select-all tabular">{c.phone}</dd>
                <dt className="text-muted-foreground">Role</dt>
                <dd>{c.role}</dd>
                {c.message && (
                  <>
                    <dt className="text-muted-foreground">Note</dt>
                    <dd className="whitespace-pre-wrap">{c.message}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Sent</dt>
                <dd>{c.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Recently reviewed</h2>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <b>{c.venue.name}</b> <span className="text-muted-foreground">· {c.user.email}</span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", c.status === "APPROVED" ? "bg-live/15 text-primary" : "bg-destructive/10 text-destructive")}>
                  {c.status === "APPROVED" ? "Approved" : "Rejected"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
