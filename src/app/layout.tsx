import "./globals.css";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/gaegu/400.css";
import "@fontsource/gaegu/700.css";

import { Christmas } from "@/components/Christmas";
import { THEME_BOOT } from "@/lib/useTheme";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "A little place for us", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body>{children}<Christmas /></body>
    </html>
  );
}
