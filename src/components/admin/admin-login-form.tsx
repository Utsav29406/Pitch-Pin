"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminSignInAction } from "@/app/auth-actions";

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/admin") ? raw : "/admin";
}

export function AdminLoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await adminSignInAction({ email, password });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    router.replace(next);
    router.refresh();
  }

  const input = "h-12 w-full rounded-xl border bg-white px-4 text-base outline-none focus:border-[#1e5a35] focus:ring-2 focus:ring-[#1e5a35]/15";
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Admin email
        </label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${input} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#131a24] font-bold text-white hover:bg-[#1f2937] disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Sign in to console
      </button>
    </form>
  );
}
