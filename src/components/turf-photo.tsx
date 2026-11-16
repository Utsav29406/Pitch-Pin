import type { Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

const LINES = "rgba(242,246,238,.22)";

/** Simple drawn markings per sport, used until the owner uploads real photos. */
function Markings({ sport }: { sport: Sport }) {
  const common = { "aria-hidden": true, className: "absolute inset-0 size-full", viewBox: "0 0 390 200", preserveAspectRatio: "none", fill: "none", stroke: LINES, strokeWidth: 2 } as const;
  if (sport === "BOX_CRICKET") {
    return (
      <svg {...common}>
        <rect x="16" y="14" width="358" height="172" rx="6" />
        <rect x="165" y="56" width="60" height="88" fill="rgba(214,196,150,.18)" stroke="none" />
        <path d="M165 72h60M165 128h60" />
        <circle cx="195" cy="100" r="70" strokeDasharray="6 8" />
      </svg>
    );
  }
  if (sport === "PICKLEBALL" || sport === "BADMINTON" || sport === "TENNIS") {
    return (
      <svg {...common}>
        <rect x="40" y="24" width="310" height="152" />
        <path d="M195 24v152" strokeWidth="3" />
        <path d={sport === "TENNIS" ? "M40 44h310M40 156h310M110 44v112M280 44v112M110 100h170" : "M150 24v152M240 24v152M40 100h110M240 100h110"} />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="16" y="14" width="358" height="172" />
      <path d="M195 14v172" />
      <circle cx="195" cy="100" r="34" />
      <rect x="16" y="58" width="44" height="84" />
      <rect x="330" y="58" width="44" height="84" />
    </svg>
  );
}

const ground: Record<Sport, string> = {
  FOOTBALL: "turf-photo",
  BOX_CRICKET: "turf-photo",
  PICKLEBALL: "bg-[#1f5a55]",
  BADMINTON: "bg-[#24506b]",
  TENNIS: "bg-[#2b5a6e]",
};

/** Venue photo, or drawn sport markings until the owner uploads one. */
export function TurfPhoto({
  src,
  alt,
  sport = "FOOTBALL",
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  sport?: Sport;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", ground[sport], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <Markings sport={sport} />
      )}
      {children}
    </div>
  );
}
