"use client";
import { GameArt } from "@/components/GameArt";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORY_LABEL, COMING_SOON, PLAYABLE } from "@/lib/games/registry";
import { GameRoom } from "@/components/GameRoom";
import type { GameDef } from "@/lib/games/types";

export default function Arcade() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [active, setActive] = useState<GameDef<any, any> | null>(null);

  const list = useMemo(() => {
    const m = (t: string, c: string) => t.toLowerCase().includes(q.toLowerCase()) && (cat === "all" || c === cat);
    return {
      play: PLAYABLE.filter(g => m(g.title, g.category)),
      soon: COMING_SOON.filter(g => m(g.title, g.category)),
    };
  }, [q, cat]);

  if (active) return <main className="px-4 py-8"><GameRoom key={active.id} game={active} onLeave={() => setActive(null)} /></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm underline">← home</Link>
      <h1 className="mt-2 font-serif text-4xl">Our Arcade</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search games" className="rounded-full bg-white/80 px-4 py-2 outline-none" />
        <select value={cat} onChange={e => setCat(e.target.value)} className="rounded-full bg-white/80 px-4 py-2">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setActive(PLAYABLE[Math.floor(Math.random() * PLAYABLE.length)])} className="rounded-full bg-rose px-4 py-2 text-white">Surprise us</button>
      </div>

      <h2 className="mt-8 font-serif text-2xl">Ready to play</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 @3xl:grid-cols-4">
        {list.play.map(g => (
          <button key={g.id} onClick={() => setActive(g)} className="rounded-[2rem] bg-white/70 p-6 text-left shadow-soft transition hover:-translate-y-1 hover:bg-blush">
            <GameArt id={g.id} className="h-20 w-20" />
            <div className="mt-2 font-serif text-xl">{g.title}</div>
            <p className="text-sm">{g.blurb}</p>
          </button>
        ))}
        {!list.play.length && <p className="col-span-full text-sm">Nothing playable matches.</p>}
      </div>

      <h2 className="mt-10 font-serif text-2xl">Coming soon</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.soon.map(g => (
          <div key={g.id} className="rounded-2xl bg-white/40 p-4 opacity-90">
            <div className="opacity-70"><GameArt id={g.id} className="h-12 w-12" /></div><div className="mt-1 text-sm">{g.title}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
