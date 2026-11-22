"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Pause, Play, Video } from "lucide-react";
import { useSpace } from "./SpaceProvider";
import { useFx } from "./FxLayer";
import { APPS } from "@/lib/apps";
import { useTheme } from "@/lib/useTheme";

/** The OS menu bar: where we are, who's here, both clocks, what's playing, and one-tap wave / call. */
export function TopBar() {
  const { partner, peer, call, music, musicApi, me } = useSpace();
  const sendFx = useFx();
  const path = usePathname();
  const th = useTheme();
  const [cursors, setCursors] = useState(true);
  useEffect(() => { try { setCursors(localStorage.getItem("showCursors") !== "0"); } catch { /* ignore */ } }, []);
  const toggleCursors = () => {
    const n = !cursors; setCursors(n);
    try { localStorage.setItem("showCursors", n ? "1" : "0"); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("cursors-toggle", { detail: n }));
  };
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
      <nav aria-label="Pages" className="ml-3 hidden items-center gap-1 lg:flex">
        {APPS.filter(a => a.ready).map(a => {
          const active = a.href === "/" ? path === "/" : path.startsWith(a.href);
          return (
            <Link key={a.href} href={a.href} aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1 font-serif text-base transition ${active ? "bg-ink text-paper" : "hover:bg-blush"}`}>{a.label}</Link>
          );
        })}
      </nav>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {music.track && (
          <span className="hidden min-w-0 items-center gap-1 rounded-full bg-blush pl-1 pr-3 md:flex">
            <button onClick={() => (music.playing ? musicApi.pause() : musicApi.play())} aria-label="Play or pause" className="rounded-full p-1.5">
              {music.playing ? <Pause size={14} /> : <Play size={14} />}</button>
            <Link href="/music" className="max-w-[10rem] truncate text-sm">♪ {music.track.title}</Link>
          </span>
        )}
        <span className="hidden items-center gap-1 rounded-full bg-white/70 px-3 py-0.5 text-sm xl:flex" title="Your time">{me.name} <span className="font-mono text-xs">{t()}</span></span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-0.5 text-sm">
          {peer ? <Heart size={15} className="animate-beat fill-rose text-rose" /> : <span className="h-2.5 w-2.5 rounded-full bg-ocean" />}
          <b className="whitespace-nowrap font-medium">{name}</b><span className="hidden sm:inline">{peer ? "is here" : "is away"}</span>
          {partner && <span className="hidden font-mono text-xs opacity-80 sm:inline">· {t(partner.timezone)}</span>}
        </span>
        <button onClick={toggleCursors} aria-pressed={cursors} title={cursors ? "Hide each other's cursors" : "Show each other's cursors"} aria-label="Show each other's cursors" className={`hidden rounded-full px-2.5 py-0.5 text-sm md:block ${cursors ? "bg-rose text-white" : "bg-white/70"}`}>👆</button>
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
