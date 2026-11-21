"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Pause, Play, SkipBack, SkipForward, Upload, Volume2 } from "lucide-react";
import { useSpace } from "@/components/SpaceProvider";

const BARS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function MusicRoom() {
  const { music, musicApi, tracks, partner } = useSpace();
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [pos, setPos] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem("favTracks") || "[]")); } catch { /* ignore */ } }, []);
  const toggleFav = (id: string) => setFavs(f => {
    const n = f.includes(id) ? f.filter(x => x !== id) : [...f, id];
    try { localStorage.setItem("favTracks", JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });

  useEffect(() => {
    if (!music.playing) { setPos(music.position); return; }
    const t0 = Date.now(), p0 = music.position + (t0 - music.sentAt) / 1000;
    setPos(p0);
    const id = setInterval(() => setPos(p0 + (Date.now() - t0) / 1000), 500);
    return () => clearInterval(id);
  }, [music.playing, music.position, music.sentAt]);

  const list = useMemo(() => (onlyFavs ? tracks.filter(t => favs.includes(t.id)) : tracks), [tracks, favs, onlyFavs]);
  const idx = tracks.findIndex(t => t.id === music.trackId);
  const prev = () => { if (tracks.length) musicApi.play(tracks[(idx <= 0 ? tracks.length : idx) - 1].id); };

  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr(null);
    try {
      await musicApi.uploadTrack(f, title.trim() || f.name.replace(/\.[^.]+$/, ""), artist.trim());
      setTitle(""); setArtist("");
    } catch (e: any) { setErr(e?.message ?? "Upload failed"); }
    finally { setBusy(false); if (file.current) file.current.value = ""; }
  };

  const t = music.track;
  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Music Room 🎵</h1>
      <p className="mt-2 text-lg">Press play and {partner?.name ?? "she"} hears the same song at the same moment.</p>

      <section className="mt-6 grid gap-5 @3xl:grid-cols-[18rem_1fr]">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-blush via-powder to-sage shadow-soft">
          <span className={`text-8xl ${music.playing ? "animate-beat" : ""}`}>{t ? "💿" : "🎶"}</span>
          <div className="absolute inset-x-4 bottom-4 flex h-14 items-end justify-center gap-1" aria-hidden>
            {BARS.map(i => (
              <span key={i} className="w-1.5 rounded-full bg-white/80"
                style={{ height: music.playing ? undefined : "12%", animation: music.playing ? `eq ${0.6 + (i % 5) * 0.15}s ease-in-out ${i * 0.05}s infinite alternate` : undefined }} />
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-[2rem] bg-paper/90 p-6 shadow-soft">
          <p className="font-serif text-3xl">{t?.title ?? (tracks.length ? "Pick a song below" : "No songs yet")}</p>
          <p className="text-lg">{t?.artist || (t ? "" : "Upload an MP3 to start our playlist")}</p>
          <input type="range" min={0} max={music.duration || 1} step={0.5} value={Math.min(pos, music.duration || 1)}
            onChange={e => musicApi.seek(+e.target.value)} disabled={!t} className="mt-5 w-full" aria-label="Seek" />
          <div className="flex justify-between text-sm"><span>{fmt(pos)}</span><span>{fmt(music.duration || 0)}</span></div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button onClick={prev} disabled={!tracks.length} aria-label="Previous" className="rounded-full bg-white/85 p-3 disabled:opacity-40"><SkipBack size={22} /></button>
            <button onClick={() => (music.playing ? musicApi.pause() : musicApi.play())} disabled={!tracks.length} aria-label="Play or pause"
              className="rounded-full bg-rose p-5 text-white shadow-soft disabled:opacity-40">{music.playing ? <Pause size={28} /> : <Play size={28} />}</button>
            <button onClick={musicApi.next} disabled={!tracks.length} aria-label="Next" className="rounded-full bg-white/85 p-3 disabled:opacity-40"><SkipForward size={22} /></button>
          </div>
          <label className="mx-auto mt-4 flex items-center gap-2 text-sm"><Volume2 size={18} />
            <input type="range" min={0} max={1} step={0.05} value={music.volume} onChange={e => musicApi.setVolume(+e.target.value)} className="w-40" aria-label="Volume" />
            <span>just for you</span></label>
        </div>
      </section>

      <section className="mt-6 grid gap-5 @3xl:grid-cols-[1fr_20rem]">
        <div className="rounded-[2rem] bg-white/70 p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Our songs</h2>
            <div className="flex gap-2 text-base">
              <button onClick={() => setOnlyFavs(false)} className={`rounded-full px-4 py-1 ${!onlyFavs ? "bg-rose text-white" : "bg-white"}`}>All</button>
              <button onClick={() => setOnlyFavs(true)} className={`rounded-full px-4 py-1 ${onlyFavs ? "bg-rose text-white" : "bg-white"}`}>♥ Favourites</button>
            </div>
          </div>
          {list.length === 0 && <p className="py-6 text-center font-hand text-2xl">{onlyFavs ? "Tap a heart to save a favourite." : "Nothing here yet."}</p>}
          <ul className="space-y-2">
            {list.map(s => (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${s.id === music.trackId ? "bg-blush" : "bg-white/80"}`}>
                <button onClick={() => musicApi.play(s.id)} aria-label={`Play ${s.title}`} className="rounded-full bg-powder p-2">
                  {s.id === music.trackId && music.playing ? <Pause size={18} /> : <Play size={18} />}</button>
                <div className="min-w-0 flex-1"><p className="truncate text-lg">{s.title}</p>{s.artist && <p className="truncate text-sm">{s.artist}</p>}</div>
                <button onClick={() => toggleFav(s.id)} aria-label="Favourite" aria-pressed={favs.includes(s.id)}>
                  <Heart size={22} className={favs.includes(s.id) ? "fill-rose text-rose" : ""} /></button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] bg-sage/60 p-5 shadow-soft">
          <h2 className="font-serif text-2xl">Add a song</h2>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="mt-3 w-full rounded-2xl bg-white px-4 py-2 text-lg" />
          <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist (optional)" className="mt-2 w-full rounded-2xl bg-white px-4 py-2 text-lg" />
          <button onClick={() => file.current?.click()} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-rose px-4 py-2.5 text-lg text-white disabled:opacity-50">
            <Upload size={20} />{busy ? "Uploading…" : "Choose an MP3"}</button>
          <input ref={file} type="file" accept="audio/*" hidden onChange={e => upload(e.target.files?.[0])} />
          {err && <p className="mt-2 text-base text-red-800">{err}</p>}
          <p className="mt-3 text-sm">Either of you can add songs. Favourites are saved on this device.</p>
        </div>
      </section>
    </main>
  );
}
