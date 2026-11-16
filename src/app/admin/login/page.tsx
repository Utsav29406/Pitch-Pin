import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { BrandMark } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

/** Already signed in as an admin? Skip the form. */
async function SkipIfAdmin() {
  const user = await getCurrentUser();
  if (user?.isAdmin) redirect("/admin");
  return null;
}

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 place-items-center bg-[#131a24] bg-[radial-gradient(60%_50%_at_50%_0%,rgb(125_211_160/0.12),transparent)] px-4 py-10">
      <Suspense>
        <SkipIfAdmin />
      </Suspense>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2.5 text-white">
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">PitchPin</span>
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#7dd3a0] uppercase">Admin console</span>
          </span>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-2xl shadow-black/40 md:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="size-6 text-[#1e5a35]" aria-hidden="true" /> Admin sign-in
            </h1>
            <p className="text-sm text-muted-foreground">For PitchPin staff only. Player accounts can&apos;t sign in here.</p>
          </div>
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>
        <a href={appUrl} className="text-center text-sm text-white/60 hover:text-white">
          ← Go to the player site
        </a>
      </div>
    </main>
  );
}
