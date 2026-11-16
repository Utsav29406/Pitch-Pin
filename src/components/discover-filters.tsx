"use client";

import { ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AREAS } from "@/lib/areas";
import { SPORTS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DateStrip } from "./date-strip";

const NEAR_KEY = "turfup:near";
const GEO = "__geo";

export type DiscoverState = { q: string; sport: string | null; date: string; near: string | null; sort: string };

export function DiscoverFilters({ days, state }: { days: string[]; state: DiscoverState }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(state.q);
  const [locating, setLocating] = useState(false);
  const [, startTransition] = useTransition();

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounce typing into the URL.
  useEffect(() => {
    if (q.trim() === state.q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Restore the last chosen area on a fresh visit.
  useEffect(() => {
    if (params.get("near")) return;
    try {
      const saved = localStorage.getItem(NEAR_KEY);
      if (saved) update({ near: saved, sort: params.get("sort") ?? "near" });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setNear(value: string | null) {
    try {
      if (value) localStorage.setItem(NEAR_KEY, value);
      else localStorage.removeItem(NEAR_KEY);
    } catch {}
    update({ near: value, sort: value ? "near" : state.sort === "near" ? null : state.sort });
  }

  function onAreaChange(value: string) {
    if (value !== GEO) return setNear(value || null);
    if (!("geolocation" in navigator)) return void toast.error("This browser can't share your location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNear(`${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`);
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Pick your area instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const nearIsGeo = !!state.near && !AREAS.some((a) => a.slug === state.near);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <label className="relative flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-full border bg-card pr-9 pl-3.5 text-sm font-semibold focus-within:border-primary lg:max-w-60">
          {nearIsGeo ? (
            <LocateFixed className="size-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className="sr-only">Area</span>
          <select
            id="area"
            value={nearIsGeo ? GEO : (state.near ?? "")}
            onChange={(e) => onAreaChange(e.target.value)}
            disabled={locating}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">All Ahmedabad</option>
            <option value={GEO}>Use my current location</option>
            {AREAS.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          <span className="truncate" aria-hidden="true">
            {locating
              ? "Finding you…"
              : nearIsGeo
                ? "Near me"
                : (AREAS.find((a) => a.slug === state.near)?.name ?? "All Ahmedabad")}
          </span>
          <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
        </label>

        <label className="order-2 flex h-13 w-full items-center gap-2.5 rounded-2xl border bg-card px-4 focus-within:border-primary lg:order-none lg:h-11 lg:w-auto lg:flex-1 lg:rounded-full">
          <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search turfs</span>
          <input
            id="turf-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search turf or area"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>

        <label className="relative ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card pr-9 pl-3.5 text-sm font-semibold focus-within:border-primary lg:ml-0">
          <span className="text-muted-foreground">Sort:</span>
          <select
            id="sort"
            value={state.sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Sort turfs"
          >
            {state.near && <option value="near">Nearest</option>}
            <option value="rating">Top rated</option>
            <option value="price">Lowest price</option>
          </select>
          <span aria-hidden="true">{state.sort === "near" ? "Nearest" : state.sort === "price" ? "Lowest price" : "Top rated"}</span>
          <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
        </label>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div role="group" aria-label="Sport" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {[{ id: null, label: "All sports" }, ...SPORTS].map((s) => {
          const active = state.sport === s.id;
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={active}
              onClick={() => update({ sport: s.id })}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 lg:shrink-0">
        <DateStrip days={days} value={state.date} onChange={(d) => update({ date: d === days[0] ? null : d })} />
      </div>
      </div>
    </div>
  );
}
