import "./globals.css";
import "@fontsource/gabarito/700.css";
import "@fontsource/gabarito/800.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/mali/500.css";
import "@fontsource/mali/600.css";
import "@fontsource/mali/700.css";

import { Christmas } from "@/components/Christmas";
import { THEME_BOOT } from "@/lib/useTheme";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "A little place for us", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-xmas="on" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body>{children}<Christmas /></body>
    </html>
  );
}
