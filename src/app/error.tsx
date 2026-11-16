"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page section crashes, instead of the blank default screen. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-3xl font-semibold">Something went off-side</h1>
      <p className="text-muted-foreground">
        This page hit an error. Try again, and if it keeps happening, go back to the turf list.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground"
        >
          Try again
        </button>
        <Link href="/" className="inline-flex h-12 items-center rounded-2xl border bg-card px-6 font-bold">
          Back to turfs
        </Link>
      </div>
    </main>
  );
}
