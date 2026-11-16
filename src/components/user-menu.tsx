import Link from "next/link";
import { signOutAction } from "@/app/auth-actions";
import { FormSubmit } from "./form-submit";
import { getCurrentUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-foreground hover:bg-secondary sm:inline-flex">
          Sign in
        </Link>
        <Link
          href="/login?mode=signup"
          className="inline-flex h-10 items-center rounded-full bg-night px-4 text-sm font-semibold text-white transition-colors hover:bg-primary"
        >
          <span className="sm:hidden">Sign in</span>
          <span className="hidden sm:inline">Join free</span>
        </Link>
      </div>
    );
  }
  return (
    <form action={signOutAction} className="flex items-center gap-2">
      <Link
        href="/account"
        title={`${user.email} · Account`}
        aria-label="Your account"
        className="grid size-10 place-items-center rounded-full bg-night text-sm font-bold text-gold-light uppercase transition-colors hover:bg-primary"
      >
        {user.email.slice(0, 2)}
      </Link>
      <FormSubmit pendingText="Signing out…" className="hidden h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex">
        Sign out
      </FormSubmit>
    </form>
  );
}
