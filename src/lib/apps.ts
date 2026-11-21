export interface AppDef { href: string; label: string; emoji: string; blurb: string; bg: string; ready: boolean }

/** The "apps" of our little OS. Used by the desktop, the dock and the title bar. Literal class names so Tailwind keeps them. */
export const APPS: AppDef[] = [
  { href: "/", label: "Home", emoji: "🏠", blurb: "Our desktop", bg: "bg-butter", ready: true },
  { href: "/date-night", label: "Date Night", emoji: "🌙", blurb: "One tap and we're together", bg: "bg-blush", ready: true },
  { href: "/arcade", label: "Arcade", emoji: "🎮", blurb: "Games for two", bg: "bg-sage", ready: true },
  { href: "/chat", label: "Chat", emoji: "💬", blurb: "Texts, photos, voice notes", bg: "bg-powder", ready: true },
  { href: "/music", label: "Music", emoji: "🎵", blurb: "Listen at the same moment", bg: "bg-blush", ready: true },
  { href: "/photo-booth", label: "Photo Booth", emoji: "📸", blurb: "Silly pictures, our scrapbook", bg: "bg-sage", ready: true },
  { href: "/bible", label: "Bible", emoji: "📖", blurb: "Read and pray side by side", bg: "bg-powder", ready: false },
  { href: "/notes", label: "Love Notes", emoji: "💌", blurb: "Little letters, open when…", bg: "bg-blush", ready: false },
  { href: "/memories", label: "Memories", emoji: "🗓️", blurb: "A timeline of us", bg: "bg-butter", ready: false },
];
export const appFor = (path: string) =>
  APPS.slice(1).find(a => path === a.href || path.startsWith(a.href + "/")) ?? APPS[0];
