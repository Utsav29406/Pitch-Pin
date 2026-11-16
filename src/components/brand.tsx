import { cn } from "@/lib/utils";

/** PitchPin mark: a map pin with a tiny pitch inside, dropping onto the map. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("brand-mark block size-8 overflow-hidden rounded-[10px] bg-primary ring-1 ring-white/15", className)}>
      <svg viewBox="0 0 48 48" fill="none" className="size-full">
        <ellipse className="brand-shadow" cx="24" cy="43" rx="7" ry="1.8" fill="#000" opacity=".3" />
        <g className="brand-pin">
          <path d="M24 5a14 14 0 0 1 14 14c0 10-14 23-14 23S10 29 10 19A14 14 0 0 1 24 5z" fill="#fbf6ea" />
          <rect x="16.5" y="13" width="15" height="12" rx="1.6" stroke="#1e5a35" strokeWidth="1.8" />
          <path d="M24 13v12" stroke="#1e5a35" strokeWidth="1.6" />
          <circle cx="24" cy="19" r="2.5" stroke="#1e5a35" strokeWidth="1.6" />
        </g>
      </svg>
    </span>
  );
}
