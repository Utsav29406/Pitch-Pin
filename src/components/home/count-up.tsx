"use client";

import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `to` once, after a short delay. Shows the real number straight away without JS or with reduced motion. */
export function CountUp({ to, delay = 1200, duration = 1400 }: { to: number; delay?: number; duration?: number }) {
  const [n, setN] = useState(to);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    started.current = true;
    let raf = 0;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return <span className="tabular">{n}</span>;
}
