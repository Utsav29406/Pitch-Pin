import Link from "next/link";
import { Suspense } from "react";
import { BrandMark } from "./brand";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="site-chrome sticky top-0 z-40 px-2.5 pt-2.5 md:px-6 md:pt-3.5">
      <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-[18px] px-3 md:h-16 md:px-5">
        <Link href="/" className="brand-link flex items-center gap-2 font-heading text-xl font-semibold">
          <BrandMark />
          <span>
            Pitch<span className="text-gold">Pin</span>
          </span>
        </Link>
        <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
          {[
            ["/turfs", "Explore turfs"],
            ["/bookings", "My bookings"],
            ["/partner", "For turf owners"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto lg:ml-0">
          <Suspense fallback={<span className="block h-9 w-20" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
