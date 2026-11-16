"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { claimAction } from "@/app/owner/actions";
import { claimSchema, type ClaimInput } from "@/lib/turf-schema";

const field = "h-12 w-full rounded-2xl border bg-background px-4 text-base outline-none focus:border-primary";

export function ClaimForm({ slug, defaultPhone }: { slug: string; defaultPhone?: string }) {
  const router = useRouter();
  const [c, setC] = useState<ClaimInput>({ slug, phone: defaultPhone ?? "", role: "Owner", message: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = claimSchema.safeParse(c);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Check the form.");
    setError(null);
    start(async () => {
      const res = await claimAction(c);
      if (!res.ok) return setError(res.error);
      toast.success("Claim sent. We'll call you to confirm.");
      router.push("/owner");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] border bg-card p-5" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Your mobile number</span>
        <input id="claim-phone" className={field} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value.replace(/[\s-]/g, "") })} />
        <span className="text-xs text-muted-foreground">We call this number to check you run the turf. It isn&apos;t shown to players.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">You are the turf&apos;s</span>
        <select id="claim-role" className={field} value={c.role} onChange={(e) => setC({ ...c, role: e.target.value as ClaimInput["role"] })}>
          <option>Owner</option>
          <option>Manager</option>
          <option>Staff</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <textarea id="claim-message" className="min-h-24 w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:border-primary" maxLength={500} value={c.message ?? ""} onChange={(e) => setC({ ...c, message: e.target.value })} placeholder="e.g. Best time to call, or the turf's Google Maps link" />
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Send claim
      </button>
    </form>
  );
}
