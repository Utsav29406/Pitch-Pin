"use client";

import { CalendarDays, Compass, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { href: "/turfs", label: "Explore", icon: Compass, match: (p: string) => p.startsWith("/turf") },
  { href: "/bookings", label: "Bookings", icon: CalendarDays, match: (p: string) => p.startsWith("/bookings") || p.startsWith("/checkout") },
  { href: "/account", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") },
];

/** Phone-only tab bar. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App"
      className="site-chrome fixed inset-x-3 z-40 grid grid-cols-4 gap-1 glass-bar rounded-[22px] p-1.5 lg:hidden"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold",
              active ? "bg-night text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
