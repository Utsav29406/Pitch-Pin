"use client";

import { BadgeCheck, CalendarDays, LayoutDashboard, MapPinned, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, blurb: "What needs attention today" },
  { href: "/admin/claims", label: "Claims", icon: BadgeCheck, blurb: "Owners asking to manage a listing" },
  { href: "/admin/turfs", label: "Turfs", icon: MapPinned, blurb: "Every turf and listing on PitchPin" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, blurb: "Find, check and cancel bookings" },
  { href: "/admin/users", label: "Users", icon: UsersRound, blurb: "Player, owner and admin accounts" },
] as const;

function useActive() {
  const path = usePathname();
  return TABS.find((t) => (t.href === "/admin" ? path === "/admin" : path.startsWith(t.href))) ?? TABS[0];
}

/** Sidebar links on desktop, a scrolling tab strip on phones. */
export function AdminNav({ variant }: { variant: "sidebar" | "strip" }) {
  const active = useActive();
  return (
    <nav
      aria-label="Admin"
      className={cn(
        variant === "sidebar" ? "flex flex-col gap-1" : "no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3",
      )}
    >
      {TABS.map((t) => {
        const on = t === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 text-sm font-semibold",
              variant === "sidebar"
                ? cn("rounded-xl px-3 py-2.5", on ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")
                : cn("rounded-full px-3.5 py-2", on ? "bg-white text-[#131a24]" : "bg-white/10 text-white/75"),
            )}
          >
            <Icon className={cn("size-4.5", variant === "sidebar" && on && "text-[#7dd3a0]")} aria-hidden="true" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTitle() {
  const t = useActive();
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold md:text-3xl">{t.label}</h1>
      <p className="text-sm text-muted-foreground">{t.blurb}</p>
    </div>
  );
}
