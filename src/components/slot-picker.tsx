"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { holdSlotsAction } from "@/app/actions";
import { hourLabel, longDate, rangeLabel, rupees } from "@/lib/format";
import type { CourtInfo, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DateStrip } from "./date-strip";

type Props = {
  slug: string;
  courts: CourtInfo[];
  days: string[];
  /** From the home screen: open on this date with this start hour selected. */
  initialDate?: string;
  initialHour?: number;
};

async function fetchSlots(courtId: string, date: string): Promise<Slot[] | null> {
  try {
    const res = await fetch(`/api/availability?courtId=${encodeURIComponent(courtId)}&date=${date}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { slots: Slot[] }).slots;
  } catch {
    return null;
  }
}

export function SlotPicker({ slug, courts, days, initialDate, initialHour }: Props) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [date, setDate] = useState(initialDate && days.includes(initialDate) ? initialDate : days[0]);
  // Preselect the hour tapped on the home screen, on the first court where it's free.
  const want = useRef<{ hour: number; tried: Set<string> } | null>(
    initialHour !== undefined ? { hour: initialHour, tried: new Set() } : null,
  );
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    fetchSlots(courtId, date).then((fresh) => {
      if (!fresh) return;
      setSlots(fresh);
      const w = want.current;
      if (w) {
        w.tried.add(courtId);
        if (fresh.find((s) => s.hour === w.hour)?.status === "open") {
          want.current = null;
          setSel([w.hour]);
          return;
        }
        const nextCourt = courts.find((c) => !w.tried.has(c.id));
        if (nextCourt) setCourtId(nextCourt.id);
        else want.current = null;
        return;
      }
      // Drop the selection if someone else just took one of its hours.
      setSel((cur) => {
        const ok = cur.filter((h) => fresh.find((s) => s.hour === h)?.status === "open");
        return ok.length === cur.length ? cur : [];
      });
    });
  }, [courtId, date, courts]);

  // Near-live: poll every 5s while the tab is visible, and right away when it comes back.
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  function pickCourt(id: string) {
    want.current = null;
    setSlots(null);
    setSel([]);
    setCourtId(id);
  }

  function pickDate(d: string) {
    want.current = null;
    setSlots(null);
    setSel([]);
    setDate(d);
  }

  function toggle(h: number) {
    setSel((cur) => {
      if (cur.includes(h)) {
        // Trim an end; removing a middle hour keeps the earlier part so the range stays consecutive.
        if (h === cur[0] || h === cur[cur.length - 1]) return cur.filter((x) => x !== h);
        return cur.filter((x) => x < h);
      }
      if (cur.length && (h === cur[0] - 1 || h === cur[cur.length - 1] + 1) && cur.length < 4) {
        return [...cur, h].sort((a, b) => a - b);
      }
      return [h];
    });
  }

  const total = useMemo(
    () => sel.reduce((sum, h) => sum + (slots?.find((s) => s.hour === h)?.price ?? 0), 0),
    [sel, slots],
  );
  const court = courts.find((c) => c.id === courtId);

  function hold() {
    if (!sel.length) return;
    startTransition(async () => {
      const res = await holdSlotsAction({
        courtId,
        date,
        startHour: sel[0],
        endHour: sel[sel.length - 1] + 1,
        mode: "FULL",
        squadSize: 1,
      });
      if (res.ok) {
        router.push(`/checkout/${res.bookingId}`);
      } else if (res.needLogin) {
        router.push(`/login?next=${encodeURIComponent(`/turf/${slug}`)}`);
      } else {
        toast.error(res.error);
        load();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <span className="pulse-dot size-2 rounded-full bg-live" aria-hidden="true" />
          Live availability · updates every few seconds
        </p>

        {courts.length > 1 && (
          <div role="group" aria-label="Court" className="grid max-w-md grid-cols-2 gap-1 rounded-2xl border bg-card p-1">
            {courts.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c.id === courtId}
                onClick={() => pickCourt(c.id)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold leading-tight",
                  c.id === courtId ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {c.name}
                <span className="text-[11px] font-medium">
                  {c.format}
                  {c.size ? ` · ${c.size}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        <DateStrip days={days} value={date} onChange={pickDate} />

        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border bg-card" />Open</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-primary" />Yours</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-held" />Someone&apos;s paying</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-dashed" />Booked</li>
          <li className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-coral" />Peak rate</li>
        </ul>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]">
          {slots === null
            ? Array.from({ length: 12 }, (_, i) => <div key={i} className="h-[58px] animate-pulse rounded-xl bg-secondary" />)
            : slots.map((s) => <SlotButton key={s.hour} slot={s} selected={sel.includes(s.hour)} onClick={() => toggle(s.hour)} />)}
        </div>
        <p className="text-xs text-muted-foreground">Tap up to 4 hours in a row to book a longer game.</p>
      </div>

      {/* Summary: sticky card on desktop, docked bar on phones */}
      <aside className="fixed inset-x-0 bottom-[84px] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:sticky lg:top-20 lg:rounded-[20px] lg:border lg:bg-card lg:p-5">
        <div className="mx-auto flex max-w-6xl items-center gap-4 lg:flex-col lg:items-stretch">
          <div className="hidden flex-col gap-2 text-sm lg:flex">
            <h2 className="text-lg font-semibold">Your booking</h2>
            <Row k="Date" v={longDate(date)} />
            <Row k="Time" v={sel.length ? rangeLabel(sel[0], sel[sel.length - 1] + 1) : "Pick a slot"} />
            <Row k="Court" v={court ? `${court.name} · ${court.format}` : "-"} />
            <hr className="my-1" />
          </div>
          <div className="min-w-0 flex-1 lg:flex lg:items-baseline lg:justify-between">
            <p className="text-xs text-muted-foreground lg:text-sm">
              <span className="lg:hidden">{sel.length ? `${sel.length} hr · ${rangeLabel(sel[0], sel[sel.length - 1] + 1)}` : "No slot picked"}</span>
              <span className="hidden lg:inline">Total</span>
            </p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={total}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                className="font-heading text-2xl font-semibold tabular"
              >
                {sel.length ? rupees(total) : "-"}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            type="button"
            disabled={!sel.length || pending}
            onClick={hold}
            className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Hold for 8 min
          </button>
          <p className="hidden text-xs text-muted-foreground lg:block">
            While held, these hours show as &quot;Someone&apos;s paying&quot; to everyone else.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 tabular">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

function SlotButton({ slot, selected, onClick }: { slot: Slot; selected: boolean; onClick: () => void }) {
  const base = "relative flex min-h-[58px] flex-col items-start justify-center rounded-xl border px-2.5 py-2 text-left tabular transition-colors";
  if (slot.status === "booked" || slot.status === "past") {
    return (
      <button type="button" disabled className={cn(base, "cursor-not-allowed border-dashed text-[#66706a]")}>
        <b className="text-sm">{hourLabel(slot.hour)}</b>
        <small className="text-[11px]">{slot.status === "past" ? "Started" : "Booked"}</small>
      </button>
    );
  }
  if (slot.status === "held") {
    return (
      <button type="button" disabled className={cn(base, "cursor-not-allowed border-held bg-held/5 text-held")}>
        <b className="text-sm">{hourLabel(slot.hour)}</b>
        <small className="text-[11px]">Held · {slot.heldMinutes}m</small>
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(base, selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}
    >
      {slot.peak && (
        <span aria-label="Peak rate" className={cn("absolute top-2 right-2 size-1.5 rounded-full", selected ? "bg-primary-foreground" : "bg-coral")} />
      )}
      <b className="text-sm">{hourLabel(slot.hour)}</b>
      <small className={cn("text-[11px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>{rupees(slot.price)}</small>
    </button>
  );
}
