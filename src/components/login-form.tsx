"use client";

import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { signInAction, signUpAction } from "@/app/auth-actions";
import { chromeIntent } from "@/lib/in-app";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Mode = "signin" | "signup";
type Phase = "idle" | "busy" | "done";

const COPY = {
  signin: { title: "Welcome back", sub: "Your squad's waiting. Sign in to book tonight's slot.", button: "Sign in" },
  signup: { title: "Join the game", sub: "Just an email and a password, and you're ready to book.", button: "Create account" },
};

const LEVELS = [
  { label: `At least ${MIN_PASSWORD} characters`, color: "#c9b98f" },
  { label: "OK, playable", color: "#d99a2b" },
  { label: "Good", color: "#8fbf4a" },
  { label: "Strong", color: "#2fbf68" },
  { label: "Match-fit", color: "#1e5a35" },
];

function strength(pw: string) {
  if (pw.length < MIN_PASSWORD) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d|[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export function LoginForm({ google = false }: { google?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState(() =>
    params.get("error") === "google" ? "Google sign-in didn't finish. Try again, or use your email and password." : "",
  );
  const inApp = params.get("error") === "inapp";
  const [shakeKey, setShakeKey] = useState(0);
  const [swapKey, setSwapKey] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const signup = mode === "signup";
  const level = strength(password);

  function switchTo(m: Mode) {
    if (m === mode || phase !== "idle") return;
    setMode(m);
    setError("");
    setSwapKey((k) => k + 1);
  }

  function fail(message: string) {
    setError(message);
    setShakeKey((k) => k + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "idle") return;
    if (!EMAIL.test(email.trim())) return fail("Enter a valid email, like name@gmail.com");
    if (!password) return fail("Enter your password.");
    if (signup) {
      if (password.length < MIN_PASSWORD) return fail(`Use at least ${MIN_PASSWORD} characters for your password.`);
      if (password !== confirm) return fail("The two passwords don't match.");
    }
    button.current?.style.setProperty("--w", `${button.current.offsetWidth}px`);
    setError("");
    setPhase("busy");
    const res = await (signup ? signUpAction : signInAction)({ email, password });
    if (!res.ok) {
      setPhase("idle");
      return fail(res.error);
    }
    setPhase("done");
    toast.success(signup ? "Account created" : "Signed in");
    await new Promise((r) => setTimeout(r, 650));
    router.replace(next);
    router.refresh();
  }

  const copy = COPY[mode];
  return (
    <form onSubmit={submit} noValidate className="auth-form auth-enter mx-auto flex w-full max-w-[400px] flex-col gap-[18px]" data-mode={mode}>
      <div role="tablist" aria-label="Account" className="auth-tabs">
        <span className="auth-thumb" aria-hidden="true" />
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchTo(m)}>
            {label}
          </button>
        ))}
      </div>

      <div key={swapKey} className={cn("flex min-h-[74px] flex-col gap-1.5", swapKey > 0 && "auth-swap")}>
        <h1 className="text-[30px] leading-[1.05] font-semibold">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.sub}</p>
      </div>

      {google && inApp && <InAppNotice next={next} />}

      {google && (
        <>
          <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="auth-google">
            <GoogleIcon />
            Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <div className={cn("auth-field", EMAIL.test(email.trim()) && "is-ok")}>
        <input id="email" type="email" autoComplete="email" inputMode="email" placeholder=" " value={email} onChange={(e) => (setEmail(e.target.value), setError(""))} />
        <label htmlFor="email">Email</label>
        <Check className="auth-tick right-4" aria-hidden="true" />
      </div>

      <div className={cn("auth-field", signup && password.length >= MIN_PASSWORD && "is-ok")}>
        <input
          id="password"
          type={show ? "text" : "password"}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder=" "
          value={password}
          onChange={(e) => (setPassword(e.target.value), setError(""))}
          className="pr-[88px]"
        />
        <label htmlFor="password">Password</label>
        <Check className="auth-tick right-[54px]" aria-hidden="true" />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="auth-eye">
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>

      <div className="auth-extra" aria-hidden={!signup}>
        <div>
          <div className="grid grid-cols-4 gap-[5px]" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={cn("auth-bar", i < level && "is-on")} style={{ "--c": LEVELS[level].color } as React.CSSProperties} />
            ))}
          </div>
          <p className="flex justify-between text-[12.5px] text-muted-foreground" aria-live="polite">
            <span>{LEVELS[level].label}</span>
            <span className="tabular">{password.length >= MIN_PASSWORD ? "✓" : `${password.length}/${MIN_PASSWORD}`}</span>
          </p>
          <div className={cn("auth-field", signup && confirm.length >= MIN_PASSWORD && confirm === password && "is-ok")}>
            <input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder=" "
              value={confirm}
              onChange={(e) => (setConfirm(e.target.value), setError(""))}
              tabIndex={signup ? 0 : -1}
            />
            <label htmlFor="confirm">Confirm password</label>
            <Check className="auth-tick right-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <button
        key={`b${shakeKey}`}
        ref={button}
        type="submit"
        aria-busy={phase === "busy"}
        className={cn("auth-submit", phase === "busy" && "is-busy", phase === "done" && "is-done", shakeKey > 0 && "is-shake")}
      >
        <span className="auth-label">
          {copy.button} <ArrowRight className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="auth-rolling" aria-hidden="true" />
        <span className="auth-done" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-[26px]">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span className="sr-only">{phase === "busy" ? "Working" : ""}</span>
      </button>
      <p role="alert" className="-mt-2 min-h-[18px] text-[13px] font-semibold text-destructive">
        {error}
      </p>

      <p className="text-center text-sm text-muted-foreground">
        {signup ? "Already have an account? " : "New to PitchPin? "}
        <button type="button" onClick={() => switchTo(signup ? "signin" : "signup")} className="font-bold text-primary underline underline-offset-[3px]">
          {signup ? "Sign in" : "Create account"}
        </button>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to PitchPin&apos;s{" "}
        <a href="/terms" className="font-semibold underline underline-offset-2">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

/** Shown when Google sign-in was started inside WhatsApp/Instagram/Facebook, where Google blocks it. */
function InAppNotice({ next }: { next: string }) {
  const [copied, setCopied] = useState(false);
  async function open() {
    const url = `${location.origin}/api/auth/google?next=${encodeURIComponent(next)}`;
    if (/Android/i.test(navigator.userAgent)) {
      location.href = chromeIntent(url);
      return;
    }
    try {
      await navigator.clipboard.writeText(`${location.origin}/login?next=${encodeURIComponent(next)}`);
      setCopied(true);
      toast.success("Link copied. Paste it in Safari or Chrome.");
    } catch {
      toast("Tap ••• or the share icon, then “Open in browser”.");
    }
  }
  return (
    <div role="alert" className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
      <p className="font-semibold">Google sign-in needs your phone’s browser</p>
      <p className="mt-1 text-muted-foreground">
        Google doesn’t allow signing in inside WhatsApp, Instagram or Facebook. Open PitchPin in Chrome or Safari: tap ••• (or the share icon) and choose “Open in browser”.
      </p>
      <button type="button" onClick={open} className="mt-3 inline-flex h-10 items-center rounded-xl bg-night px-4 font-semibold text-white hover:bg-primary">
        {copied ? "Link copied" : "Open in browser"}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
