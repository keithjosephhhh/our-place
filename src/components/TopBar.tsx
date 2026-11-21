"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Pause, Play, Video } from "lucide-react";
import { useSpace } from "./SpaceProvider";
import { useFx } from "./FxLayer";
import { appFor } from "@/lib/apps";
import { useTheme } from "@/lib/useTheme";

/** The OS menu bar: where we are, who's here, both clocks, what's playing, and one-tap wave / call. */
export function TopBar() {
  const { partner, peer, call, music, musicApi, me } = useSpace();
  const sendFx = useFx();
  const path = usePathname();
  const app = appFor(path);
  const th = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(i); }, []);
  const t = (tz?: string) => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const name = partner?.name ?? "Your person";
  const inCall = call.state !== "idle";

  return (
    <header className="topbar fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b-2 border-white/70 bg-paper/90 px-3 text-base backdrop-blur">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full px-2 py-0.5 font-serif text-lg hover:bg-blush">
        <span aria-hidden>{th.xmas ? "🎅" : "🧸"}</span><span className="hidden sm:inline">Our Place</span>
      </Link>
      <span className="hidden shrink-0 rounded-full bg-butter px-3 py-0.5 text-sm sm:inline">{app.emoji} {app.label}</span>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {music.track && (
          <span className="hidden min-w-0 items-center gap-1 rounded-full bg-blush pl-1 pr-3 md:flex">
            <button onClick={() => (music.playing ? musicApi.pause() : musicApi.play())} aria-label="Play or pause" className="rounded-full p-1.5">
              {music.playing ? <Pause size={14} /> : <Play size={14} />}</button>
            <Link href="/music" className="max-w-[10rem] truncate text-sm">♪ {music.track.title}</Link>
          </span>
        )}
        <span className="hidden items-center gap-1 rounded-full bg-white/70 px-3 py-0.5 text-sm lg:flex" title="Your time">🏠 {me.name} {t()}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-0.5 text-sm">
          {peer ? <Heart size={15} className="animate-beat fill-rose text-rose" /> : <span className="h-2.5 w-2.5 rounded-full bg-ocean" />}
          <b className="font-medium">{name}</b><span className="hidden sm:inline">{peer ? "is here" : "is away"}</span>
          {partner && <span className="opacity-80">· {t(partner.timezone)}</span>}
        </span>
        <button onClick={() => th.setXmas(!th.xmas)} aria-pressed={th.xmas} title="Christmas mode" aria-label="Christmas mode" className={`rounded-full px-2.5 py-0.5 text-sm ${th.xmas ? "bg-rose text-white" : "bg-white/70"}`}>🎄</button>
        <button onClick={() => th.setDark(!th.dark)} aria-pressed={th.dark} title={th.dark ? "Light mode" : "Dark mode"} aria-label={th.dark ? "Light mode" : "Dark mode"} className="rounded-full bg-white/70 px-2.5 py-0.5 text-sm">{th.dark ? "☀️" : "🌙"}</button>
        <button onClick={() => sendFx("wave")} disabled={!peer} title={peer ? `Wave at ${name}` : `${name} isn't online`} className="rounded-full bg-blush px-3 py-0.5 text-sm disabled:opacity-50">👋</button>
        {!inCall && (
          <button onClick={() => call.start(false)} className="flex items-center gap-1 rounded-full bg-rose px-3 py-0.5 text-sm text-white"><Video size={15} /> Call</button>
        )}
      </div>
      {call.error && !inCall && (
        <div className="absolute right-3 top-14 rounded-2xl bg-white p-3 text-base text-red-800 shadow-soft">
          {call.error}
          <button onClick={() => call.start(true)} className="mt-1 block underline">Join audio-only instead</button>
        </div>
      )}
    </header>
  );
}
