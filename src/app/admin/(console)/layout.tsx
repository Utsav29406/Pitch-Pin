import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { adminSignOutAction } from "@/app/auth-actions";
import { AdminNav, AdminTitle } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/brand";
import { FormSubmit } from "@/components/form-submit";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";

function Wordmark() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 text-white">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="font-semibold">PitchPin</span>
        <span className="text-[11px] font-bold tracking-[0.14em] text-[#7dd3a0] uppercase">Admin console</span>
      </span>
    </Link>
  );
}

async function Who() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
      <p className="truncate text-xs text-white/50" title={user.email}>
        Signed in as <span className="text-white/80">{user.email}</span>
      </p>
      <form action={adminSignOutAction}>
        <FormSubmit pendingText="Signing out…" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </FormSubmit>
      </form>
    </div>
  );
}

function SiteLink() {
  return (
    <a href={appUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
      <ExternalLink className="size-4" aria-hidden="true" /> Open player site
    </a>
  );
}

export default function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 bg-[#131a24] px-4 py-6 lg:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <Suspense fallback={<div className="h-64" />}>
          <AdminNav variant="sidebar" />
        </Suspense>
        <div className="mt-auto flex flex-col gap-4 px-2">
          <SiteLink />
          <Suspense>
            <Who />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 bg-[#131a24] px-4 pt-3 lg:hidden">
          <div className="flex items-center justify-between pb-3">
            <Wordmark />
            <form action={adminSignOutAction}>
              <FormSubmit aria-label="Sign out" pendingText="" className="grid size-10 place-items-center rounded-full text-white/70 hover:bg-white/10">
                <LogOut className="size-5" aria-hidden="true" />
              </FormSubmit>
            </form>
          </div>
          <Suspense fallback={<div className="h-12" />}>
            <AdminNav variant="strip" />
          </Suspense>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
          <Suspense fallback={<div className="h-14" />}>
            <AdminTitle />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
