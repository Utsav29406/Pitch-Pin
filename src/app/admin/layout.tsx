import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "PitchPin Admin", template: "%s · PitchPin Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#131a24" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin-theme flex min-h-dvh flex-1 flex-col">{children}</div>;
}
