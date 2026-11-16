"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AdminResult } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

/**
 * Two-step button for admin actions: the first tap asks "Sure?", the second runs it.
 * (Browser confirm() dialogs are avoided so it works the same everywhere.)
 */
export function ConfirmButton({
  action,
  label,
  confirm = "Tap again to confirm",
  done,
  danger,
}: {
  action: () => Promise<AdminResult>;
  label: string;
  confirm?: string;
  done: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        start(async () => {
          const res = await action();
          if (res.ok) toast.success(done);
          else toast.error(res.error);
          router.refresh();
        });
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap disabled:opacity-60",
        armed ? (danger ? "border-destructive bg-destructive text-white" : "border-primary bg-primary text-primary-foreground") : danger ? "text-destructive hover:border-destructive" : "hover:border-primary",
      )}
    >
      {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {armed ? confirm : label}
    </button>
  );
}
