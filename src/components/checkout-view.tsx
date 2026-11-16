"use client";

import { Clock, Copy, Loader2, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelHoldAction, changeModeAction, demoPayAction, squadLinksAction } from "@/app/actions";
import { longDate, mmss, rangeLabel, rupees } from "@/lib/format";
import { payShare } from "@/lib/use-razorpay";
import { cn } from "@/lib/utils";

export type CheckoutBooking = {
  id: string;
  code: string;
  status: "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  mode: "FULL" | "SPLIT";
  squadSize: number;
  amount: number;
  holdExpiresAt: string;
  date: string;
  startHour: number;
  endHour: number;
  venueName: string;
  venueSlug: string;
  courtLabel: string;
  isOrganiser: boolean;
  linksSent: boolean;
  /** No Razorpay keys: payments are simulated and nobody is charged. */
  demo: boolean;
};

export type CheckoutShare = {
  id: string;
  label: string;
  amount: number;
  status: "PENDING" | "PAID" | "REFUNDED";
  mine: boolean;
};

export function CheckoutView({ booking, shares }: { booking: CheckoutBooking; shares: CheckoutShare[] }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() => (new Date(booking.holdExpiresAt).getTime() - Date.now()) / 1000);
  const [busy, startBusy] = useTransition();
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelledNow, setCancelledNow] = useState(false);

  const split = booking.mode === "SPLIT";
  const paidCount = shares.filter((s) => s.status === "PAID").length;
  const collected = shares.filter((s) => s.status === "PAID").reduce((a, s) => a + s.amount, 0);
  const pct = Math.round((collected / booking.amount) * 100);
  const mine = shares.find((s) => s.mine);
  const canEditSplit = booking.isOrganiser && !booking.linksSent && paidCount === 0;

  useEffect(() => {
    const end = new Date(booking.holdExpiresAt).getTime();
    const t = setInterval(() => {
      const left = (end - Date.now()) / 1000;
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [booking.holdExpiresAt, router]);

  useEffect(() => {
    if (booking.status === "CONFIRMED") router.replace(`/bookings/${booking.id}`);
  }, [booking.status, booking.id, router]);

  // Near-live: re-read payment progress every 4s while the tab is visible.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 4_000);
    return () => clearInterval(t);
  }, [router]);

  function setMode(mode: "FULL" | "SPLIT", size = booking.squadSize) {
    startBusy(async () => {
      const res = await changeModeAction(booking.id, mode, mode === "SPLIT" ? Math.max(2, size) : 1);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  function sendLinks() {
    startBusy(async () => {
      const res = await squadLinksAction(booking.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMessage(res.message);
      router.refresh();
    });
  }

  async function pay() {
    if (!mine) return;
    setPaying(true);
    const res = booking.demo ? await demoPayAction(mine.id) : await payShare(mine.id);
    setPaying(false);
    if (res.ok) toast.success("Payment received");
    else if ("error" in res && res.error) toast.error(res.error);
    router.refresh();
  }

  function cancel() {
    startBusy(async () => {
      const res = await cancelHoldAction(booking.id);
      if (res.ok) {
        setCancelledNow(true);
        toast.success("Booking cancelled");
      } else toast.error(res.error);
      setConfirmCancel(false);
      router.refresh();
    });
  }

  if (cancelledNow || booking.status === "EXPIRED" || booking.status === "CANCELLED" || secondsLeft <= 0) {
    const cancelled = cancelledNow || booking.status === "CANCELLED";
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-[20px] border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">{cancelled ? "Booking cancelled" : "This hold has ended"}</h1>
        <p className="text-muted-foreground">
          The slots went back on sale. Anyone who already paid gets an automatic refund to their original payment method.
        </p>
        <Link href={`/turf/${booking.venueSlug}`} className="mx-auto inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground">
          Pick a slot again
        </Link>
      </div>
    );
  }

  const payLabel = !mine
    ? null
    : mine.status === "PAID"
      ? split
        ? `Waiting for squad · ${shares.length - paidCount} left`
        : "Paid"
      : split
        ? `Pay my share ${rupees(mine.amount)}`
        : `Pay ${rupees(booking.amount)}`;
  const payButton = payLabel;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-3 rounded-2xl border border-[#c28c14]/45 bg-sun/15 px-4 py-3">
          <Clock className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-[74px] font-heading text-2xl font-semibold text-primary tabular" aria-live="off">
            {mmss(secondsLeft)}
          </span>
          <span className="text-sm">Your slots are held. Finish payment before the timer ends or they go back on sale.</span>
        </div>

        {booking.isOrganiser && (
          <div role="group" aria-label="How to pay" className="grid max-w-lg grid-cols-2 gap-1 rounded-2xl border bg-card p-1">
            {(["FULL", "SPLIT"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={booking.mode === m}
                disabled={!canEditSplit || busy}
                onClick={() => booking.mode !== m && setMode(m)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center rounded-xl text-sm leading-tight font-semibold disabled:cursor-not-allowed",
                  booking.mode === m ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {m === "FULL" ? "Pay full" : "Split with squad"}
                <span className="text-[11px] font-medium">
                  {m === "FULL" ? `${rupees(booking.amount)} now` : "Everyone pays their share"}
                </span>
              </button>
            ))}
          </div>
        )}

        {split ? (
          <section className="flex flex-col gap-4 rounded-[18px] border bg-card p-4" aria-label="Squad payments">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">Squad size</p>
                <p className="text-sm text-muted-foreground">{rupees(shares[1]?.amount ?? 0)} per player</p>
              </div>
              {canEditSplit && (
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label="Fewer players" disabled={busy || booking.squadSize <= 2} onClick={() => setMode("SPLIT", booking.squadSize - 1)} className="grid size-11 place-items-center rounded-xl border bg-secondary disabled:opacity-40">
                    <Minus className="size-4" />
                  </button>
                  <output className="w-8 text-center font-bold tabular" aria-live="polite">{booking.squadSize}</output>
                  <button type="button" aria-label="More players" disabled={busy || booking.squadSize >= 22} onClick={() => setMode("SPLIT", booking.squadSize + 1)} className="grid size-11 place-items-center rounded-xl border bg-secondary disabled:opacity-40">
                    <Plus className="size-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="pulse-dot size-2 rounded-full bg-live" aria-hidden="true" />
                {paidCount} of {shares.length} paid
              </span>
              <span className="tabular">{rupees(collected)} / {rupees(booking.amount)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Amount collected">
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(190px,100%),1fr))] gap-3">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                    {s.label === "You" ? "You" : s.label.replace("Player ", "P")}
                  </span>
                  <span className="min-w-0 truncate">{s.mine ? "You" : s.label}</span>
                  <span className={cn("ml-auto rounded-full px-2 py-1 text-xs font-bold", s.status === "PAID" ? "bg-[#1e7a43]/12 text-[#1a6b3b]" : "bg-coral/12 text-[#a8461a]")}>
                    {s.status === "PAID" ? "Paid" : s.status === "REFUNDED" ? "Refunded" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
            {booking.isOrganiser &&
              (message ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center rounded-xl border border-[#9ccfae] bg-[#25d366]/10 px-4 font-semibold text-[#17693a]"
                  >
                    Open WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(message).then(() => toast.success("Links copied"), () => toast.error("Copy failed"))}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border bg-card px-4 font-semibold"
                  >
                    <Copy className="size-4" aria-hidden="true" /> Copy links
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={sendLinks}
                  className="inline-flex h-12 max-w-sm items-center justify-center gap-2 rounded-xl border border-[#9ccfae] bg-[#25d366]/10 font-semibold text-[#17693a]"
                >
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {booking.linksSent ? "Share pay links again" : "Send pay links on WhatsApp"}
                </button>
              ))}
            <p className="text-xs text-muted-foreground">
              If the squad hasn&apos;t paid in full when the hold ends, everyone who paid is refunded automatically.
            </p>
          </section>
        ) : (
          <section className="rounded-[18px] border bg-card p-4">
            <p className="font-bold">You pay the whole booking now</p>
            {canEditSplit && <p className="text-sm text-muted-foreground">Switch to Split with squad to send everyone a payment link instead.</p>}
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-3 rounded-[20px] border bg-card p-5 lg:sticky lg:top-20">
        <p className="font-heading text-lg font-semibold">{booking.venueName}</p>
        <Row k="Date" v={longDate(booking.date)} />
        <Row k="Time" v={rangeLabel(booking.startHour, booking.endHour)} />
        <Row k="Court" v={booking.courtLabel} />
        <Row k="Booking" v={booking.code} />
        <hr />
        <Row k="Total" v={rupees(booking.amount)} strong />
        {split && mine && <Row k="Your share" v={rupees(mine.amount)} strong />}
        {payLabel && (
          <button
            type="button"
            disabled={paying || mine?.status !== "PENDING"}
            onClick={pay}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground"
          >
            {paying && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {payButton}
          </button>
        )}
        <p className="text-xs text-muted-foreground">
          {booking.demo ? "No money is charged." : "Paid through Razorpay: UPI, cards and netbanking."}
        </p>
        {booking.isOrganiser && booking.status === "HELD" && (
          <div className="border-t pt-3">
            {confirmCancel ? (
              <div className="flex flex-col gap-3" role="alertdialog" aria-labelledby="cancel-title" aria-describedby="cancel-desc">
                <div>
                  <p id="cancel-title" className="font-semibold">Cancel this booking?</p>
                  <p id="cancel-desc" className="text-sm text-muted-foreground">
                    {paidCount > 0
                      ? `Your slots go back on sale and the ${paidCount} ${paidCount === 1 ? "player who paid is" : "players who paid are"} refunded automatically.`
                      : "Your slots go back on sale. Nobody has paid yet, so nothing is charged."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="h-11 flex-1 rounded-xl border bg-card font-semibold hover:bg-secondary">
                    Keep it
                  </button>
                  <button type="button" disabled={busy} onClick={cancel} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive font-semibold text-white hover:bg-destructive/90 disabled:opacity-60">
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Yes, cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" disabled={paying} onClick={() => setConfirmCancel(true)} className="w-full rounded-xl py-2 text-sm font-semibold text-destructive hover:bg-destructive/8">
                Cancel booking
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 text-sm tabular", strong && "font-bold")}>
      <span className={strong ? "" : "text-muted-foreground"}>{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
