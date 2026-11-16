import { ChevronLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ClaimForm } from "@/components/owner/claim-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sportLabel, type Sport } from "@/lib/types";

export const metadata: Metadata = { title: "Claim your turf", robots: { index: false } };

export default function ClaimPage({ params }: PageProps<"/owner/claim/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-6 md:pt-10">
      <Link href="/owner/claim" className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold">
        <ChevronLeft className="size-4" aria-hidden="true" /> Search again
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
        <Claim params={params} />
      </Suspense>
    </main>
  );
}

async function Claim({ params }: { params: PageProps<"/owner/claim/[slug]">["params"] }) {
  const { slug } = await params;
  const user = await requireUser(`/owner/claim/${slug}`);
  const [venue, profile] = await Promise.all([
    db().venue.findUnique({ where: { slug }, select: { id: true, name: true, area: true, address: true, sports: true, ownerId: true } }),
    db().profile.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);
  if (!venue) notFound();
  if (venue.ownerId === user.id) redirect(`/owner/turf/${slug}`);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Claim {venue.name}</h1>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" /> {venue.address}
        </p>
        <p className="text-sm text-muted-foreground">{venue.sports.map((s) => sportLabel(s as Sport)).join(", ")}</p>
      </div>
      {venue.ownerId ? (
        <p className="rounded-2xl border bg-card p-5">
          This turf is already managed by its owner on PitchPin. If you think that&apos;s a mistake, contact us from the{" "}
          <Link href="/partner" className="font-semibold text-primary underline">
            owners page
          </Link>
          .
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>1. Send this claim with your number.</li>
            <li>2. We call to confirm you run the turf (usually within a day).</li>
            <li>3. Once approved, add your courts and prices. Players can book straight away.</li>
          </ol>
          <ClaimForm slug={slug} defaultPhone={profile?.phone ?? undefined} />
        </>
      )}
    </>
  );
}
