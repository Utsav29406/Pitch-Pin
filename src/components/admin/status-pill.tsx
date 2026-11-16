import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    CONFIRMED: ["Confirmed", "bg-live/15 text-primary"],
    HELD: ["Paying", "bg-gold-light/30 text-gold"],
    CANCELLED: ["Cancelled", "bg-destructive/10 text-destructive"],
    EXPIRED: ["Expired", "bg-secondary text-muted-foreground"],
  };
  const [label, cls] = map[status] ?? [status, "bg-secondary"];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap", cls)}>{label}</span>;
}
