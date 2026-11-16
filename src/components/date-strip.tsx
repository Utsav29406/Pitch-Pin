"use client";

import { dayParts } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DateStrip({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string;
  onChange: (d: string) => void;
}) {
  return (
    <div role="group" aria-label="Choose a date" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {days.map((d) => {
        const p = dayParts(d, days[0]);
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(d)}
            className={cn(
              "flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 tabular transition-colors",
              active ? "border-foreground bg-foreground text-background" : "bg-card hover:border-primary/40",
            )}
          >
            <span className={cn("text-[11px] tracking-wide uppercase", active ? "text-background/75" : "text-muted-foreground")}>
              {p.short}
            </span>
            <span className="font-heading text-xl font-semibold">{p.day}</span>
          </button>
        );
      })}
    </div>
  );
}
