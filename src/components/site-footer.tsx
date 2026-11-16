import Link from "next/link";
import { InstallLink } from "./install-app";

export function SiteFooter() {
  return (
    <footer className="site-chrome mx-auto mt-16 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-4 pt-6 text-sm text-muted-foreground md:px-6">
      <span>© 2026 PitchPin · Turf booking in Ahmedabad</span>
      <nav aria-label="Legal" className="flex flex-wrap gap-4">
        <InstallLink />
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
        <a href="mailto:teampitchpinn@gmail.com" className="hover:text-foreground hover:underline">teampitchpinn@gmail.com</a>
      </nav>
    </footer>
  );
}
