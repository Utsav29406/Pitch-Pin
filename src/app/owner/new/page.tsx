import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TurfForm } from "@/components/owner/turf-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add your turf", robots: { index: false } };

export default function NewTurfPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 md:px-6 md:pt-10">
      <Link href="/owner" className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold">
        <ChevronLeft className="size-4" aria-hidden="true" /> Your turfs
      </Link>
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Add your <em className="text-gold">turf</em>
        </h1>
        <p className="text-muted-foreground">It goes live as soon as you publish. You can change anything later.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
        <Gate />
      </Suspense>
    </main>
  );
}

async function Gate() {
  await requireUser("/owner/new");
  return <TurfForm />;
}
