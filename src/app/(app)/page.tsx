"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Moon } from "lucide-react";
import { LobbyTiles } from "@/components/LobbyTiles";
import { useSpace } from "@/components/SpaceProvider";
import { Scenery } from "@/components/Scenery";
import { PLAYABLE } from "@/lib/games/registry";
import { APPS } from "@/lib/apps";
import { useTheme } from "@/lib/useTheme";

const DATE_IDEAS = [
  "Play a round of Connect Four", "Listen to three songs together", "Ask each other five deep questions",
  "Draw each other in 60 seconds", "Plan a dream holiday", "Share an old photograph", "Read a Bible chapter together",
  "Doodle on the call and guess what the other drew", "Pick a slow song and dance on camera",
];
const DAILY = [
  "Thinking of you is my favourite habit.", "Distance is just a number between hugs.",
  "Every little thing reminds me of you.", "Today is a good day to miss you out loud.",
];

// Configurable via NEXT_PUBLIC_TOGETHER_SINCE (YYYY-MM-DD).
const SINCE = process.env.NEXT_PUBLIC_TOGETHER_SINCE;

export default function Home() {
  const { me, partner, peer, music, tracks } = useSpace();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(i); }, []);
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = (tz: string) => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const sky = (tz: string) => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(now)) % 24;
    return h >= 6 && h < 19 ? "🌞" : "🌙";
  };
  const day = Math.floor(now.getTime() / 86_400_000);
  const days = SINCE ? Math.max(0, Math.floor((now.getTime() - new Date(SINCE).getTime()) / 86_400_000)) : null;
  const th = useTheme();
  const [xp, setXp] = useState(0);
  useEffect(() => { try { setXp(+(localStorage.getItem("cozyXp") || 0)); } catch { /* ignore */ } }, []);
  const lvl = Math.floor(Math.sqrt(xp / 5)) + 1, lo = 5 * (lvl - 1) ** 2, hi = 5 * lvl ** 2;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: myTz }).format(now)) % 24;
  const hello = hour < 5 ? "Still up?" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [idea, setIdea] = useState(DATE_IDEAS[day % DATE_IDEAS.length]);

  return (
    <main>
      <section className="relative overflow-hidden px-5 pb-6 pt-5">
        <Scenery className="absolute inset-0 -z-10 h-full w-full" />
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-hand text-2xl">{th.xmas ? "Merry Christmas" : hello}, {me.name} {th.xmas ? "🎄" : "☀️"}</p>
          <h1 className="mt-1 text-4xl text-ink sm:text-5xl">A little place for us</h1>
          <p className="mt-1 text-base">{peer ? <span className="text-green-700">● {partner?.name} is online right now</span> : `${partner?.name ?? "She"} isn't online yet. Send a wave and she'll see it when she's back.`}</p>
        </div>
        <LobbyTiles className="mx-auto mt-4 max-w-4xl" />
        <div className="mt-4 text-center">
          <p className="font-hand text-xl">{DAILY[day % DAILY.length]}</p>
          <Link href="/date-night" className="mt-3 inline-flex items-center gap-2 rounded-full border-b-4 border-ink/20 bg-rose px-8 py-3 text-xl text-white shadow-soft transition hover:scale-105">
            <Moon size={20} /> Start a date night
          </Link>
        </div>
      </section>

      <h2 className="mx-auto max-w-5xl px-6 pb-2 text-2xl">Our apps</h2>
      <nav className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-5 sm:grid-cols-3 @3xl:grid-cols-4">
        {APPS.slice(1).map((t, i) => {
          const Icon = t.icon;
          const body = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-ink"><Icon size={26} /></span>
              <span className="mt-3 block font-serif text-xl">{t.label}</span>
              <span className="mt-0.5 block text-sm leading-snug">{t.ready ? (t.href === "/arcade" ? `${PLAYABLE.length} games ready` : t.blurb) : "coming soon"}</span>
            </>
          );
          return (
            <motion.div key={t.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5 }}>
              {t.ready ? (
                <Link href={t.href} className={`block min-h-[9rem] rounded-[1.75rem] border-b-4 border-ink/15 ${t.bg} p-4 shadow-soft transition hover:-translate-y-1.5 active:translate-y-0.5 active:border-b-2`}>{body}</Link>
              ) : (
                <div className="min-h-[9rem] rounded-[1.75rem] border-2 border-dashed border-ink/20 bg-white/50 p-4 opacity-70">{body}</div>
              )}
            </motion.div>
          );
        })}
      </nav>

      <section className="mx-auto mt-6 grid max-w-5xl gap-4 px-5 pb-6 @3xl:grid-cols-3">
        <div className="flex flex-col justify-center rounded-[2rem] bg-white/75 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Right now</p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <div><div className="text-4xl">{sky(myTz)}</div><div className="font-serif text-2xl">{time(myTz)}</div><div className="text-base">{me.name}</div></div>
            <Heart className="animate-beat fill-rose text-rose" size={22} />
            <div><div className="text-4xl">{partner ? sky(partner.timezone) : "·"}</div><div className="font-serif text-2xl">{partner ? time(partner.timezone) : "--:--"}</div><div className="text-base">{partner?.name ?? "…"}</div></div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[2rem] bg-sage/70 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Today&apos;s date idea</p>
          <p className="mt-3 font-hand text-3xl leading-snug">{idea}</p>
          <button onClick={() => setIdea(DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)])} className="mt-3 rounded-full bg-white/80 px-4 py-1.5 text-base">another idea</button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[2rem] bg-blush/80 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Cozy level</p>
          <p className="mt-1 font-serif text-5xl">Lv {lvl}</p>
          <div className="my-2 h-3 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-rose" style={{ width: `${Math.min(100, ((xp - lo) / (hi - lo)) * 100)}%` }} /></div>
          <p className="text-sm">Earn ✨ for every minute you spend together on a call ({xp} so far)</p>
          {days !== null ? (
            <>

              <p className="mt-3 font-serif text-4xl">{days} <span className="text-xl">days together 💗</span></p>
            </>
          ) : (
            <p className="mt-3 text-sm">Set NEXT_PUBLIC_TOGETHER_SINCE to count your days together.</p>
          )}
        </div>
      </section>
    </main>
  );
}
