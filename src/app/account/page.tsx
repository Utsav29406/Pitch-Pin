import { FormSubmit } from "@/components/form-submit";
import { CalendarDays, ChevronRight, LogOut, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth-actions";
import { ReminderSettings } from "@/components/reminder-settings";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-semibold">Your account</h1>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-[20px] bg-secondary" />}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await requireUser("/account");
  const [profile, upcoming, owned] = await Promise.all([
    db().profile.findUnique({ where: { id: user.id } }),
    db().booking.count({ where: { userId: user.id, status: "CONFIRMED", date: { gte: new Date(new Date().toISOString().slice(0, 10)) } } }),
    db().venue.count({ where: { ownerId: user.id } }),
  ]);

  return (
    <>
      <section className="flex items-center gap-4 rounded-[18px] border bg-card p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground uppercase">
          {user.email.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.email}</p>
          <p className="text-sm text-muted-foreground">
            Member since {profile?.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
      </section>

      <Link href="/bookings" className="flex min-h-14 items-center gap-3 rounded-[18px] border bg-card px-4 hover:shadow-sm">
        <CalendarDays className="size-5 text-primary" aria-hidden="true" />
        <span className="flex-1 font-semibold">My bookings</span>
        {upcoming > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{upcoming} upcoming</span>
        )}
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>

      <Link href="/owner" className="flex min-h-14 items-center gap-3 rounded-[18px] border bg-card px-4 hover:shadow-sm">
        <Store className="size-5 text-primary" aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-semibold">{owned > 0 ? "Your turfs" : "Own a turf?"}</span>
          <span className="block text-xs text-muted-foreground">{owned > 0 ? `${owned} turf${owned === 1 ? "" : "s"} · courts, prices and bookings` : "Claim it or add it, and take bookings"}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>

      {profile && (
        <ReminderSettings initial={{ emailOptIn: profile.emailOptIn, pushOptIn: profile.pushOptIn }} />
      )}

      <form action={signOutAction}>
        <FormSubmit pendingText="Signing out…" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card font-semibold text-destructive">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </FormSubmit>
      </form>
    </>
  );
}
