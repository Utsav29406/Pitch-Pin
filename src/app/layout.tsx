import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { InstallBanner } from "@/components/install-app";
import { NavProgress } from "@/components/nav-progress";
import { OpeningSplash } from "@/components/opening-splash";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import iosSplash from "@/lib/ios-splash.json";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: { default: "PitchPin · Book turfs in Ahmedabad", template: "%s · PitchPin" },
  description:
    "Book football, box cricket and pickleball turfs across Ahmedabad. Live slots, split the bill with your squad.",
  applicationName: "PitchPin",
  // iPhone home-screen app: full screen, PitchPin launch screen for every iPhone size (iOS ignores the manifest for these).
  appleWebApp: { capable: true, title: "PitchPin", statusBarStyle: "default", startupImage: iosSplash },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#f3f6f3",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${fraunces.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <OpeningSplash />
        <Suspense>
          <NavProgress />
        </Suspense>
        <SiteHeader />
        <div className="site-main flex-1 pb-28 lg:pb-16">
          {children}
          <SiteFooter />
        </div>
        <Suspense>
          <BottomNav />
        </Suspense>
        <Toaster position="top-center" theme="light" richColors />
        <InstallBanner />
        <PwaRegister />
      </body>
    </html>
  );
}
