"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { demoPayLinkAction } from "@/app/actions";

export function DemoPayButton({ shareId, label }: { shareId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await demoPayLinkAction(shareId);
            if (res.ok) router.push("/pay/thanks");
            else setError(res.error);
          })
        }
        className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {label}
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
