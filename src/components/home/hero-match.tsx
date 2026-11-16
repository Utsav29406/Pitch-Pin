"use client";

import { useEffect, useRef, useState } from "react";

type P = { team: "g" | "c"; hx: number; hy: number; x: number; y: number };
const HOME: P[] = (
  [
    ["g", 22, 40], ["g", 30, 62], ["g", 40, 30], ["g", 44, 70], ["g", 20, 52],
    ["c", 78, 38], ["c", 70, 64], ["c", 60, 30], ["c", 58, 72], ["c", 82, 52],
  ] as const
).map(([team, hx, hy]) => ({ team, hx, hy, x: hx, y: hy }));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Decorative 5-a-side under the floodlights: the ball moves about, someone scores every few passes. */
export function HeroMatch() {
  const [players, setPlayers] = useState(HOME);
  const [ball, setBall] = useState({ x: 50, y: 52 });
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [goalKey, setGoalKey] = useState(0);
  const [bump, setBump] = useState<[number, number]>([0, 0]);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    let attack: "g" | "c" = "g";
    let visible = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (root.current) io.observe(root.current);

    const move = () => {
      if (!visible || document.hidden) return;
      step++;
      const goal = step % 6 === 0;
      const t = goal
        ? { x: attack === "g" ? 97 : 3, y: 52 + (Math.random() * 10 - 5) }
        : { x: 25 + Math.random() * 50, y: 22 + Math.random() * 56 };
      setBall(t);
      setPlayers((ps) =>
        ps.map((p) => {
          const chase = Math.random() < 0.35;
          const push = (attack === p.team ? 6 : -6) * (p.team === "g" ? 1 : -1);
          const x = chase ? t.x + (Math.random() * 14 - 7) : p.hx + (Math.random() * 12 - 6) + push;
          const y = chase ? t.y + (Math.random() * 14 - 7) : p.hy + (Math.random() * 12 - 6);
          return { ...p, x: clamp(x, 4, 96), y: clamp(y, 8, 92) };
        }),
      );
      if (goal) {
        const side = attack === "g" ? 0 : 1;
        timers.push(
          setTimeout(() => {
            setScore((s) => (side ? [s[0], s[1] + 1] : [s[0] + 1, s[1]]));
            setBump((b) => (side ? [b[0], b[1] + 1] : [b[0] + 1, b[1]]));
            setGoalKey((k) => k + 1);
            timers.push(
              setTimeout(() => {
                setBall({ x: 50, y: 52 });
                attack = attack === "g" ? "c" : "g";
              }, 1200),
            );
          }, 900),
        );
      }
    };
    let interval: ReturnType<typeof setInterval> | undefined;
    timers.push(
      setTimeout(() => {
        move();
        interval = setInterval(move, 1300);
      }, 1800),
    );
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="hero-match relative min-h-[260px] select-none lg:min-h-[420px]">
      <div className="hero-score">
        <span className="hero-live">LIVE</span>
        <span>Bopal FC</span>
        <b key={`a${bump[0]}`} className={bump[0] ? "is-bump" : undefined}>{score[0]}</b>
        <span>–</span>
        <b key={`b${bump[1]}`} className={bump[1] ? "is-bump" : undefined}>{score[1]}</b>
        <span>Night Owls</span>
      </div>
      <div className="hero-minipitch">
        <span className="hero-box hero-box-l" />
        <span className="hero-box hero-box-r" />
      </div>
      <div className="hero-field">
        {players.map((p, i) => (
          <span key={i} className={`hero-player ${p.team === "g" ? "bg-gold-light" : "bg-[#f2f6ee]"}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
        <span className="hero-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
      </div>
      {goalKey > 0 && (
        <div key={goalKey} className="hero-goal">
          Goal!
        </div>
      )}
    </div>
  );
}
