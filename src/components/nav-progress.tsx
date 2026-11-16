"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin gold bar across the top while the next page loads, so every link tap gets instant feedback.
 * It starts on a same-site link click and finishes as soon as the URL changes.
 */
export function NavProgress() {
  const key = `${usePathname()}?${useSearchParams()}`;
  const current = useRef(key);
  // URL the click happened on: while we're still on it, the next page is loading.
  const [from, setFrom] = useState<string | null>(null);
  const state = from === null ? "idle" : from === key ? "loading" : "done";

  useEffect(() => {
    current.current = key;
  }, [key]);

  useEffect(() => {
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page or #hash
      setFrom(current.current);
      clearTimeout(giveUp);
      giveUp = setTimeout(() => setFrom(null), 12000); // never hang if the navigation was cancelled
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(giveUp);
    };
  }, []);

  return <div aria-hidden="true" className="nav-progress" data-state={state} />;
}
