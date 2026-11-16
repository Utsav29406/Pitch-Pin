"use client";

import { ChevronDown, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AREAS } from "@/lib/areas";

const NEAR_KEY = "turfup:near";

function readSavedArea() {
  try {
    const v = localStorage.getItem(NEAR_KEY);
    return v && AREAS.some((a) => a.slug === v) ? v : "";
  } catch {
    return "";
  }
}

/** The area chosen last time (localStorage); "" on the server and first paint. */
function useSavedArea() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    readSavedArea,
    () => "",
  );
}

function toExplore(router: ReturnType<typeof useRouter>, near: string, q: string) {
  const sp = new URLSearchParams();
  if (near) sp.set("near", near);
  if (near) sp.set("sort", "near");
  if (q.trim()) sp.set("q", q.trim());
  try {
    if (near) localStorage.setItem(NEAR_KEY, near);
  } catch {}
  router.push(`/turfs${sp.size ? `?${sp}` : ""}`);
}

const EXAMPLES = ["box cricket in Bopal", "football tonight", "pickleball near Thaltej", "turf in Prahlad Nagar"];

/** Types example searches into the placeholder while the box is empty and not focused. */
function useTypedPlaceholder(paused: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let line = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = EXAMPLES[line];
      let wait = deleting ? 35 : 75;
      if (!deleting) {
        chars++;
        if (chars === t.length) {
          deleting = true;
          wait = 1600;
        }
      } else {
        chars--;
        if (chars === 0) {
          deleting = false;
          line = (line + 1) % EXAMPLES.length;
        }
      }
      setText(t.slice(0, chars));
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, [paused]);
  return paused || !text ? "Search turf, sport or area…" : `Try “${text}”`;
}

/** Hero: area · search · button in one bar. */
export function HeroSearch() {
  const router = useRouter();
  const saved = useSavedArea();
  const [picked, setNear] = useState<string | null>(null);
  const near = picked ?? saved;
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const placeholder = useTypedPlaceholder(focused || q.length > 0);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        toExplore(router, near, q);
      }}
      className="hero-search relative flex w-full max-w-2xl flex-col gap-2 rounded-[22px] bg-card p-2 text-foreground shadow-2xl shadow-black/30 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full"
    >
      <label className="relative flex h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold sm:w-52 sm:rounded-none sm:border-r">
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        <span className="sr-only">Area</span>
        <select
          id="hero-area"
          value={near}
          onChange={(e) => setNear(e.target.value)}
          className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-6 outline-none"
        >
          <option value="">All Ahmedabad</option>
          {AREAS.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
      </label>
      <label className="flex h-12 min-w-0 flex-1 items-center gap-2 px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search turfs</span>
        <input
          id="hero-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </label>
      <button type="submit" className="hero-find relative h-12 shrink-0 overflow-hidden rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 sm:rounded-full">
        Find a turf
      </button>
    </form>
  );
}
