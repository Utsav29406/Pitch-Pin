"use client";

import { Crosshair, Loader2, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveTurfAction } from "@/app/owner/actions";
import { AREAS } from "@/lib/areas";
import { hourLabel } from "@/lib/format";
import { AMENITIES, FORMATS, turfSchema, type CourtInput, type TurfInput } from "@/lib/turf-schema";
import { SPORTS, type Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("./location-picker"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-secondary" />,
});

const field = "h-12 w-full min-w-0 rounded-2xl border bg-background px-4 text-base outline-none focus:border-primary";
const label = "text-sm font-semibold";

const newCourt = (n: number, sport: Sport = "FOOTBALL"): CourtInput => ({
  name: `Court ${n}`,
  sport,
  format: FORMATS[sport][0],
  size: "",
  basePrice: 1000,
  peakPrice: 1400,
  peakFromHour: 18,
});

type Href = Parameters<ReturnType<typeof useRouter>["push"]>[0];

export function TurfForm({
  initial,
  savedHref,
  loginPath = "/login?next=/owner",
}: {
  initial?: TurfInput;
  /** Where to go after saving; owners default to their dashboard (the admin console passes its turf list). */
  savedHref?: string;
  loginPath?: string;
}) {
  const router = useRouter();
  const uid = useId();
  const editing = Boolean(initial?.slug);
  const [t, setT] = useState<TurfInput>(
    initial ?? {
      name: "",
      area: AREAS[0].name,
      address: "",
      lat: AREAS[0].lat,
      lng: AREAS[0].lng,
      openHour: 6,
      closeHour: 24,
      amenities: ["Floodlights", "Parking", "Drinking water"],
      courts: [newCourt(1)],
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);

  const set = <K extends keyof TurfInput>(k: K, v: TurfInput[K]) => setT((s) => ({ ...s, [k]: v }));
  const setCourt = (i: number, patch: Partial<CourtInput>) =>
    setT((s) => ({ ...s, courts: s.courts.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  function pickArea(name: string) {
    const a = AREAS.find((x) => x.name === name);
    // Move the pin to the new area unless the owner already placed it by hand somewhere else.
    setT((s) => ({ ...s, area: name, ...(a && !editing ? { lat: a.lat, lng: a.lng } : {}) }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("This browser can't share its location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setT((s) => ({ ...s, lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }));
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = turfSchema.safeParse(t);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveTurfAction(t);
      if (!res.ok) {
        if (res.needLogin) router.push(loginPath as Href);
        setError(res.error);
        return;
      }
      toast.success(editing ? "Changes saved" : "Your turf is live");
      router.push((savedHref ?? `/owner?saved=${res.slug}`) as Href);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <Section title="About your turf">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={label}>Turf name</span>
            <input id={`${uid}-name`} className={field} value={t.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Green Field Sports Arena" maxLength={80} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Area</span>
            <select id={`${uid}-area`} className={field} value={t.area} onChange={(e) => pickArea(e.target.value)}>
              {AREAS.map((a) => (
                <option key={a.slug} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Address or landmark</span>
            <input id={`${uid}-address`} className={field} value={t.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, near a landmark" maxLength={200} required />
          </label>
        </div>
      </Section>

      <Section title="Location" hint="Tap the map or drag the pin to your gate, so players' directions are exact.">
        <div className="relative isolate h-72 overflow-hidden rounded-2xl border md:h-80">
          <LocationPicker value={{ lat: t.lat, lng: t.lng }} onChange={(p) => setT((s) => ({ ...s, ...p }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex h-11 items-center gap-2 rounded-xl border bg-card px-4 font-semibold hover:border-primary">
            {locating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Crosshair className="size-4" aria-hidden="true" />}
            I&apos;m at the turf: use my location
          </button>
          <span className="text-muted-foreground tabular">
            {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
          </span>
        </div>
      </Section>

      <Section title="Opening hours">
        <div className="grid max-w-md grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Opens</span>
            <select id={`${uid}-open`} className={field} value={String(t.openHour)} onChange={(e) => set("openHour", Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Closes</span>
            <select id={`${uid}-close`} className={field} value={String(t.closeHour)} onChange={(e) => set("closeHour", Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h === 24 ? "Midnight" : hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Facilities">
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const on = t.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => set("amenities", on ? t.amenities.filter((x) => x !== a) : [...t.amenities, a])}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
              >
                {a}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Courts and prices" hint="Prices are per hour. Peak price applies from the hour you choose until closing.">
        <ol className="flex flex-col gap-4">
          {t.courts.map((c, i) => (
            <li key={c.id ?? `new-${i}`} className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading text-lg font-semibold">Court {i + 1}</p>
                <button
                  type="button"
                  disabled={t.courts.length === 1}
                  onClick={() => set("courts", t.courts.filter((_, j) => j !== i))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-30"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Court name</span>
                  <input id={`${uid}-c${i}-name`} className={field} value={c.name} onChange={(e) => setCourt(i, { name: e.target.value })} maxLength={40} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Sport</span>
                  <select
                    id={`${uid}-c${i}-sport`}
                    className={field}
                    value={c.sport}
                    onChange={(e) => {
                      const sport = e.target.value as Sport;
                      setCourt(i, { sport, format: FORMATS[sport][0] });
                    }}
                  >
                    {SPORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Format</span>
                  <select id={`${uid}-c${i}-format`} className={field} value={c.format} onChange={(e) => setCourt(i, { format: e.target.value })}>
                    {[...new Set([...FORMATS[c.sport as Sport], c.format])].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>
                    Size <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <input id={`${uid}-c${i}-size`} className={field} value={c.size ?? ""} onChange={(e) => setCourt(i, { size: e.target.value })} placeholder="40×20 m" maxLength={30} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Price per hour (₹)</span>
                  <input id={`${uid}-c${i}-base`} className={field} type="number" inputMode="numeric" min={100} step={50} value={String(c.basePrice)} onChange={(e) => setCourt(i, { basePrice: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Peak price per hour (₹)</span>
                  <input id={`${uid}-c${i}-peak`} className={field} type="number" inputMode="numeric" min={100} step={50} value={String(c.peakPrice)} onChange={(e) => setCourt(i, { peakPrice: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Peak starts at</span>
                  <select id={`${uid}-c${i}-peakfrom`} className={field} value={String(c.peakFromHour)} onChange={(e) => setCourt(i, { peakFromHour: Number(e.target.value) })}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => set("courts", [...t.courts, newCourt(t.courts.length + 1, (t.courts.at(-1)?.sport as Sport) ?? "FOOTBALL")])}
          className="inline-flex h-12 w-fit items-center gap-2 rounded-2xl border border-dashed border-primary px-5 font-semibold text-primary hover:bg-primary/5"
        >
          <Plus className="size-4" aria-hidden="true" /> Add another court
        </button>
      </Section>

      <div className="sticky bottom-[92px] z-20 flex flex-col gap-2 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {editing ? "Save changes" : "Publish my turf"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
