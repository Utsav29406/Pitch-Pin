"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideClaimAction } from "@/app/owner/actions";

export function ClaimDecision({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<boolean | null>(null);

  const decide = (approve: boolean) => {
    setWhich(approve);
    start(async () => {
      const res = await decideClaimAction(claimId, approve);
      if (!res.ok) toast.error(res.error);
      else toast.success(approve ? "Approved. The owner can now add courts." : "Claim rejected");
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => decide(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {pending && which === true ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        Approve
      </button>
      <button type="button" disabled={pending} onClick={() => decide(false)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold text-destructive disabled:opacity-60">
        {pending && which === false ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
        Reject
      </button>
    </div>
  );
}
