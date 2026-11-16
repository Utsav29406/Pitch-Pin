import { CalendarClock, IndianRupee, QrCode, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/home/sections";

export const metadata: Metadata = {
  title: "For turf owners",
  description: "List your turf on PitchPin: live slot booking, squad payments and no double bookings.",
};

const POINTS = [
  { icon: CalendarClock, title: "Live slot calendar", body: "Players see your real free hours and book in seconds. No more phone calls and WhatsApp back-and-forth." },
  { icon: ShieldCheck, title: "No double bookings", body: "Every hour can only be held by one squad at a time, and unpaid holds release themselves automatically." },
  { icon: IndianRupee, title: "Paid before kick-off", body: "Squads pay in full or split the bill online before the slot is confirmed." },
  { icon: QrCode, title: "QR check-in", body: "Every booking comes with an entry QR your staff can scan at the gate." },
];

export default function PartnerPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-8 md:px-6 md:pt-14">
      <div className="flex max-w-2xl flex-col gap-3">
        <Eyebrow>For turf owners</Eyebrow>
        <h1 className="text-4xl leading-tight font-semibold md:text-5xl">
          Fill your empty hours with <em className="text-gold">real bookings</em>.
        </h1>
        <p className="text-lg text-muted-foreground">
          List your turf on PitchPin and let players across Ahmedabad book and pay for slots online.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-2xl border bg-card p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <section className="hero-night flex flex-col gap-5 rounded-3xl p-6 text-[#f2f6ee] md:p-10">
        <h2 className="text-3xl font-semibold">
          Get your turf <em className="text-gold-light">bookable</em> in three steps
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Claim or add your turf", "Most Ahmedabad turfs are already listed. Claim yours, or add it if it's missing."],
            ["Add courts and prices", "Set your hours, peak pricing and every court or box you rent out."],
            ["Take bookings", "Players book and pay online. Every booking shows up on your dashboard."],
          ].map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-1">
              <span className="font-heading text-3xl text-gold-light italic">{i + 1}</span>
              <b>{title}</b>
              <span className="text-sm text-[#f2f6ee]/75">{body}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link href="/owner/claim" className="inline-flex h-12 items-center rounded-full bg-gold-light px-6 font-semibold text-night hover:brightness-105">
            Find and claim my turf
          </Link>
          <Link href="/owner/new" className="inline-flex h-12 items-center rounded-full border border-[#f2f6ee]/40 px-6 font-semibold hover:bg-white/10">
            Add a new turf
          </Link>
        </div>
      </section>
    </main>
  );
}
