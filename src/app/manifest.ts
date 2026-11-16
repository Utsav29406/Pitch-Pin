import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PitchPin · Ahmedabad turf booking",
    short_name: "PitchPin",
    description: "Book football, box cricket and pickleball turfs across Ahmedabad and split the bill with your squad.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f3f6f3",
    theme_color: "#f3f6f3",
    categories: ["sports", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    screenshots: [
      { src: "/screenshots/phone-home.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Find a turf near you" },
      { src: "/screenshots/phone-explore.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Live slots for every turf" },
      { src: "/screenshots/wide-home.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "Book turfs across Ahmedabad" },
      { src: "/screenshots/wide-explore.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "Explore 140 turfs" },
    ],
    shortcuts: [
      { name: "Explore turfs", url: "/turfs", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My bookings", url: "/bookings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
