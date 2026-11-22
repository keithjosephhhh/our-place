import { BookOpen, Camera, CalendarHeart, Gamepad2, Home, Mail, MessageCircle, Moon, Music, type LucideIcon } from "lucide-react";

export interface AppDef { href: string; label: string; icon: LucideIcon; blurb: string; bg: string; ready: boolean }

/** The apps of our little place. Used by the top tabs, the phone tab bar and the home page. Literal class names so Tailwind keeps them. */
export const APPS: AppDef[] = [
  { href: "/", label: "Home", icon: Home, blurb: "Our lobby", bg: "bg-butter", ready: true },
  { href: "/date-night", label: "Date night", icon: Moon, blurb: "One tap and we're together", bg: "bg-blush", ready: true },
  { href: "/arcade", label: "Arcade", icon: Gamepad2, blurb: "Games for two", bg: "bg-sage", ready: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, blurb: "Texts, photos, voice notes", bg: "bg-powder", ready: true },
  { href: "/music", label: "Music", icon: Music, blurb: "Listen at the same moment", bg: "bg-ocean", ready: true },
  { href: "/photo-booth", label: "Photos", icon: Camera, blurb: "Face filters and photo strips", bg: "bg-cocoa", ready: true },
  { href: "/bible", label: "Bible", icon: BookOpen, blurb: "Read and pray side by side", bg: "bg-powder", ready: false },
  { href: "/notes", label: "Love notes", icon: Mail, blurb: "Little letters, open when…", bg: "bg-blush", ready: false },
  { href: "/memories", label: "Memories", icon: CalendarHeart, blurb: "A timeline of us", bg: "bg-butter", ready: false },
];
export const appFor = (path: string) =>
  APPS.slice(1).find(a => path === a.href || path.startsWith(a.href + "/")) ?? APPS[0];
