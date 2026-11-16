"use client";

import { Download, MoreVertical, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isInAppBrowser } from "@/lib/in-app";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Platform = "prompt" | "ios" | "inapp" | "other";
declare global {
  interface Window {
    __ppInstall?: PromptEvent;
  }
}

const DISMISS_KEY = "pp-install-dismissed";
const DISMISS_DAYS = 14;

function isInstalled() {
  return matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

let justInstalled = false;
function subscribe(cb: () => void) {
  const onInstalled = () => {
    justInstalled = true;
    window.__ppInstall = undefined;
    cb();
  };
  window.addEventListener("pp-installable", cb);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("pp-installable", cb);
    window.removeEventListener("appinstalled", onInstalled);
  };
}
function snapshot(): Platform | "installed" {
  if (justInstalled || isInstalled()) return "installed";
  if (window.__ppInstall) return "prompt";
  // Instagram/WhatsApp/Facebook browsers can't install apps: send people to Safari or Chrome first.
  if (isInAppBrowser(navigator.userAgent)) return "inapp";
  return isIos() ? "ios" : "other";
}

/** Works out how this browser installs apps: a real install prompt (Chrome, Edge, Samsung, Opera) or manual steps. */
function useInstall() {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  const [declined, setDeclined] = useState(false);
  const installed = state === "installed";
  const platform: Platform | null = installed || !state ? null : declined && state === "prompt" ? (isIos() ? "ios" : "other") : state;

  /** Returns true when the browser's own install dialog was shown; false means show manual steps. */
  async function install() {
    const e = window.__ppInstall;
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    window.__ppInstall = undefined;
    if (outcome === "accepted") justInstalled = true;
    setDeclined(true);
    return true;
  }

  return { platform, installed, install };
}

function Steps({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const ios = platform === "ios" || (platform === "inapp" && isIos());
  const inApp = platform === "inapp";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[24px] bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-[14px]" />
            <div>
              <h2 id="install-title" className="font-heading text-xl font-semibold">Install PitchPin</h2>
              <p className="text-sm text-muted-foreground">{ios ? "iPhone installs apps from Safari’s Share menu. Takes 10 seconds." : "Installs like any app and opens full screen."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        <ol className="mt-5 flex flex-col gap-3 text-[15px]">
          {inApp && (
            <li className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
                <MoreVertical className="size-[18px]" />
              </span>
              <span>
                First open PitchPin in <b>{ios ? "Safari" : "Chrome"}</b>: tap <b>•••</b> and choose <b>Open in browser</b>
              </span>
            </li>
          )}
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
              {ios ? <Share className="size-[18px]" /> : <MoreVertical className="size-[18px]" />}
            </span>
            <span>
              {ios ? <>Tap <b>Share</b> in Safari’s toolbar (on newer iPhones, tap <b>•••</b> first, then <b>Share</b>)</> : <>Tap <b>the menu</b> (⋮ or ☰) in your browser</>}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
              <SquarePlus className="size-[18px]" />
            </span>
            <span>
              {ios ? <>Scroll down and tap <b>Add to Home Screen</b>. If you see <b>Open as Web App</b>, keep it on</> : <>Choose <b>Install app</b> or <b>Add to Home screen</b></>}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
              <Download className="size-[18px]" />
            </span>
            <span>
              Tap <b>{ios ? "Add" : "Install"}</b>. PitchPin installs with your apps and opens full screen.
            </span>
          </li>
        </ol>
        <button type="button" onClick={onClose} className="mt-5 h-12 w-full rounded-2xl bg-night font-semibold text-white hover:bg-primary">
          Got it
        </button>
      </div>
    </div>
  );
}

/** "Install the app" link for the footer: works in every browser (install dialog or steps). */
export function InstallLink() {
  const { platform, installed, install } = useInstall();
  const [steps, setSteps] = useState(false);
  if (installed || !platform) return null;
  return (
    <>
      <button type="button" onClick={async () => (await install()) || setSteps(true)} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline">
        <Download className="size-4" aria-hidden="true" /> Install the app
      </button>
      {steps && <Steps platform={platform} onClose={() => setSteps(false)} />}
    </>
  );
}

/** Phone-only card above the tab bar, offering to install. Hidden once installed or dismissed. */
export function InstallBanner() {
  const { platform, installed, install } = useInstall();
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    if (!platform || installed || dismissedRecently() || !matchMedia("(max-width: 1023px)").matches) return;
    const t = setTimeout(() => setShow(true), 3500); // after the opening screen
    return () => clearTimeout(t);
  }, [platform, installed]);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (installed || !platform) return null;
  return (
    <>
      {show && (
        <div
          className="site-chrome install-banner fixed inset-x-3 z-40 flex items-center gap-3 rounded-[20px] border bg-card p-3 shadow-[0_12px_30px_rgb(15_36_24/.16)] lg:hidden"
          style={{ bottom: "calc(max(12px, env(safe-area-inset-bottom)) + 74px)" }}
          role="region"
          aria-label="Install PitchPin"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-11 rounded-[12px]" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Get the PitchPin app</p>
            <p className="text-sm leading-tight text-muted-foreground">Book in one tap from your home screen</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!(await install())) setSteps(true);
              setShow(false);
            }}
            className="h-10 shrink-0 rounded-full bg-night px-4 text-sm font-semibold text-white hover:bg-primary"
          >
            Install
          </button>
          <button type="button" onClick={dismiss} aria-label="Not now" className="-ml-1 rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
      )}
      {steps && <Steps platform={platform} onClose={() => setSteps(false)} />}
    </>
  );
}
