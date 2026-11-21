"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCw, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/components/SpaceProvider";
import { FILTERS, FILTER_CSS, type FilterKind } from "@/lib/stageStyle";

type Layout = "strip" | "single";
interface Theme { id: string; label: string; bg: string; fg: string }
const THEMES: Theme[] = [
  { id: "cream", label: "Cream", bg: "#FFF6E6", fg: "#4A2F25" },
  { id: "peach", label: "Peach", bg: "#FFD9C7", fg: "#4A2F25" },
  { id: "mint", label: "Mint", bg: "#CFE0B0", fg: "#2F4A2A" },
  { id: "cocoa", label: "Cocoa", bg: "#4A2F25", fg: "#FFF6E6" },
  { id: "xmas", label: "Christmas", bg: "#B3202D", fg: "#FFFFFF" },
];
const STICKERS: Record<string, string[]> = {
  none: [], hearts: ["💗", "💕", "💖", "✨"], stars: ["⭐", "🌟", "✨", "🌙"], xmas: ["🎄", "❄️", "🎁", "⭐", "🎅"], flowers: ["🌸", "🌼", "🌷", "🦋"],
};
const STICKER_LABEL: Record<string, string> = { none: "None", hearts: "💗 Hearts", stars: "⭐ Stars", xmas: "🎄 Christmas", flowers: "🌸 Flowers" };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Draw a video into a rectangle like CSS object-fit: cover, optionally mirrored and filtered. */
function drawCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number, mirror: boolean, filter: string) {
  if (!v.videoWidth) { ctx.fillStyle = "#EEE"; ctx.fillRect(x, y, w, h); return; }
  const vr = v.videoWidth / v.videoHeight, cr = w / h;
  let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
  if (vr > cr) { sw = sh * cr; sx = (v.videoWidth - sw) / 2; } else { sh = sw / cr; sy = (v.videoHeight - sh) / 2; }
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if ("filter" in ctx) ctx.filter = filter || "none";
  if (mirror) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h); }
  else ctx.drawImage(v, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export default function PhotoBooth() {
  const { me, partner, call, spaceId, channel } = useSpace();
  const preview = spaceId === "preview";
  const { on, send } = channel;

  const [own, setOwn] = useState<MediaStream | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const stream = call.localStream ?? own;
  const myVid = useRef<HTMLVideoElement>(null);
  const theirVid = useRef<HTMLVideoElement>(null);

  const [filter, setFilter] = useState<FilterKind>("warm");
  const [layout, setLayout] = useState<Layout>("strip");
  const [theme, setTheme] = useState("peach");
  const [stickers, setStickers] = useState("hearts");
  const [together, setTogether] = useState(false);
  const [caption, setCaption] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [theirCount, setTheirCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<HTMLCanvasElement[]>([]);
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [album, setAlbum] = useState<{ path: string; url: string; when: number }[]>([]);
  const [big, setBig] = useState<string | null>(null);

  const canTogether = call.state === "connected" && !!call.remoteStream;
  const both = together && canTogether;

  // our own camera when we're not already in a call (the call already has one)
  useEffect(() => {
    if (call.localStream) { setOwn(s => { s?.getTracks().forEach(t => t.stop()); return null; }); return; }
    let live: MediaStream | null = null, cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then(s => { if (cancelled) { s.getTracks().forEach(t => t.stop()); return; } live = s; setOwn(s); })
      .catch(() => setCamErr("We couldn't open your camera. Allow camera access in the browser's address bar and reload."));
    return () => { cancelled = true; live?.getTracks().forEach(t => t.stop()); };
  }, [call.localStream]);
  useEffect(() => { if (myVid.current) myVid.current.srcObject = stream; }, [stream, both]);
  useEffect(() => { if (theirVid.current) theirVid.current.srcObject = call.remoteStream; }, [call.remoteStream, both]);

  // the other person sees a countdown too, so they can get ready
  useEffect(() => on("booth-count", () => {
    let n = 3; setTheirCount(n);
    const i = setInterval(() => { n -= 1; if (n <= 0) { clearInterval(i); setTheirCount(null); } else setTheirCount(n); }, 1000);
  }), [on]);

  // ---------- album ----------
  const loadAlbum = useCallback(async () => {
    if (preview) return;
    const sb = supabase();
    const { data } = await sb.storage.from("media").list(`${spaceId}/photos`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const files = (data ?? []).filter(f => f.name.endsWith(".png"));
    if (!files.length) { setAlbum([]); return; }
    const paths = files.map(f => `${spaceId}/photos/${f.name}`);
    const { data: signed } = await sb.storage.from("media").createSignedUrls(paths, 60 * 60 * 6);
    setAlbum(files.map((f, i) => ({ path: paths[i], url: signed?.[i]?.signedUrl ?? "", when: +f.name.split("-")[0] || 0 })));
  }, [preview, spaceId]);
  useEffect(() => { loadAlbum(); }, [loadAlbum]);

  // ---------- taking pictures ----------
  const cellSize = both ? { w: 900, h: 600 } : { w: 800, h: 600 };
  const snap = () => {
    const c = document.createElement("canvas"); c.width = cellSize.w; c.height = cellSize.h;
    const ctx = c.getContext("2d")!; const f = FILTER_CSS[filter];
    if (both && myVid.current && theirVid.current) {
      drawCover(ctx, myVid.current, 0, 0, cellSize.w / 2, cellSize.h, true, f);
      drawCover(ctx, theirVid.current, cellSize.w / 2, 0, cellSize.w / 2, cellSize.h, false, f);
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(cellSize.w / 2 - 2, 0, 4, cellSize.h);
    } else if (myVid.current) drawCover(ctx, myVid.current, 0, 0, cellSize.w, cellSize.h, true, f);
    return c;
  };

  const compose = (cells: HTMLCanvasElement[]) => {
    const th = THEMES.find(t => t.id === theme)!;
    const cw = cells[0].width, ch = cells[0].height, pad = 44, gap = 26, foot = 150;
    const W = cw + pad * 2, H = pad + cells.length * ch + (cells.length - 1) * gap + foot + pad / 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    cells.forEach((cell, i) => {
      const y = pad + i * (ch + gap);
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#fff"; ctx.fillRect(pad - 8, y - 8, cw + 16, ch + 16); ctx.restore();
      ctx.drawImage(cell, pad, y);
    });
    const date = new Date().toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
    ctx.fillStyle = th.fg; ctx.textAlign = "center";
    ctx.font = "700 54px 'Gaegu', cursive";
    ctx.fillText(caption.trim() || `${me.name} & ${partner?.name ?? ""}`, W / 2, H - foot / 2 - 10);
    ctx.font = "400 30px 'Fredoka', sans-serif"; ctx.globalAlpha = 0.8;
    ctx.fillText(date, W / 2, H - foot / 2 + 40); ctx.globalAlpha = 1;
    const em = STICKERS[stickers];
    if (em.length) {
      ctx.font = "64px sans-serif";
      let k = 0;
      const put = (x: number, y: number, rot: number) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillText(em[k++ % em.length], 0, 0); ctx.restore(); };
      put(pad + 10, pad + 40, -0.3); put(W - pad - 10, pad + 60, 0.3);
      put(pad / 2 + 14, H / 2, -0.2); put(W - pad / 2 - 14, H / 2 + 80, 0.25);
      put(pad + 30, H - 40, -0.2); put(W - pad - 30, H - 40, 0.2);
    }
    return new Promise<void>(res => c.toBlob(b => { if (b) setResult(r => { if (r) URL.revokeObjectURL(r.url); return { url: URL.createObjectURL(b), blob: b }; }); res(); }, "image/png"));
  };

  const start = async () => {
    if (busy || !stream) return;
    setBusy(true); setResult(null); setShots([]); setNote(null);
    const total = layout === "strip" ? 4 : 1; const got: HTMLCanvasElement[] = [];
    for (let i = 0; i < total; i++) {
      if (both) send("booth-count", { shot: i, total });
      for (let n = 3; n >= 1; n--) { setCount(n); await sleep(1000); }
      setCount(null); setFlash(true); got.push(snap()); setShots([...got]);
      setTimeout(() => setFlash(false), 180);
      if (i < total - 1) await sleep(900);
    }
    await compose(got);
    setBusy(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = result.url; a.download = `photo-booth-${new Date().toISOString().slice(0, 10)}.png`; a.click();
  };
  const save = async () => {
    if (!result) return;
    if (preview) { setAlbum(a => [{ path: result.url, url: result.url, when: Date.now() }, ...a]); setNote("Saved to the album (preview only) 💌"); return; }
    setNote("Saving…");
    const path = `${spaceId}/photos/${Date.now()}-${me.name.replace(/[^\w]/g, "")}.png`;
    const { error } = await supabase().storage.from("media").upload(path, result.blob, { contentType: "image/png" });
    if (error) { setNote(`Couldn't save: ${error.message}`); return; }
    setNote("Saved to our album 💌"); loadAlbum();
  };
  const remove = async (path: string) => {
    if (!confirm("Delete this picture for both of you?")) return;
    if (!preview) await supabase().storage.from("media").remove([path]);
    setAlbum(a => a.filter(x => x.path !== path)); setBig(null);
  };

  const chip = (on: boolean) => `rounded-full px-4 py-1.5 text-base ${on ? "bg-rose text-white" : "bg-white/85 hover:bg-blush"}`;
  const th = THEMES.find(t => t.id === theme)!;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-32 pt-6">
      <h1 className="sr-only">Photo Booth</h1>

      {/* ---------- the booth ---------- */}
      <div className="mx-auto max-w-4xl">
        {/* striped awning + lit sign */}
        <div className="relative z-10 mx-4 overflow-hidden rounded-t-[2rem] shadow-soft">
          <div className="booth-awning h-9" />
          <div className="flex items-center justify-center gap-3 bg-[#2A1B16] px-4 py-2">
            <span className="booth-lights" aria-hidden>{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.25}s` }} />)}</span>
            <span className="font-serif text-2xl tracking-[0.25em] text-[#FFE08A] drop-shadow-[0_0_10px_rgba(255,200,80,.8)] sm:text-4xl">PHOTO BOOTH</span>
            <span className="booth-lights" aria-hidden>{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.25 + 0.12}s` }} />)}</span>
          </div>
          <p className="bg-[#2A1B16] pb-2 text-center font-hand text-xl text-[#FFE08A]/90">4 pictures · for 2 hearts ♥</p>
        </div>

        {/* cabinet */}
        <div className="relative rounded-b-[2rem] border-x-[14px] border-b-[14px] border-[#6B4030] bg-[#3A2620] p-3 shadow-soft sm:p-5">
          <div className="grid gap-4 @3xl:grid-cols-[1fr_17rem]">
            {/* curtains + mirror window */}
            <div className="relative rounded-2xl bg-[#241712] p-3 sm:p-4">
              <div className="booth-curtain absolute inset-y-0 left-0 w-[9%] rounded-l-2xl" aria-hidden />
              <div className="booth-curtain absolute inset-y-0 right-0 w-[9%] rounded-r-2xl" aria-hidden />
              <div className="relative mx-auto w-[78%]">
                {/* lens and flash lamps */}
                <div className="mb-3 flex items-center justify-center gap-6">
                  <span className={`booth-lamp ${flash || count !== null ? "on" : ""}`} aria-hidden />
                  <span className="booth-lens" aria-hidden />
                  <span className={`booth-lamp ${flash || count !== null ? "on" : ""}`} aria-hidden />
                </div>
                <div className={`relative overflow-hidden rounded-3xl border-[10px] border-[#D9D3C9] bg-black shadow-[inset_0_0_30px_rgba(0,0,0,.7)] ${both ? "aspect-[3/2]" : "aspect-[4/3]"} max-h-[52vh] mx-auto`}>
                  <div className="absolute inset-0 flex">
                    <video ref={myVid} autoPlay playsInline muted className={`h-full ${both ? "w-1/2" : "w-full"} -scale-x-100 object-cover`} style={{ filter: FILTER_CSS[filter] || undefined }} />
                    {both && <video ref={theirVid} autoPlay playsInline muted className="h-full w-1/2 border-l-4 border-white/90 object-cover" style={{ filter: FILTER_CSS[filter] || undefined }} />}
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" aria-hidden />
                  {!stream && <div className="absolute inset-0 grid place-items-center bg-blush p-6 text-center font-hand text-2xl text-ink">{camErr ?? "Opening the camera…"}</div>}
                  {count !== null && <div className="absolute inset-0 grid place-items-center bg-black/25"><span className="font-serif text-9xl text-white drop-shadow-lg">{count}</span></div>}
                  {theirCount !== null && count === null && <div className="absolute inset-0 grid place-items-center bg-black/25"><span className="rounded-full bg-paper/95 px-6 py-2 text-center font-hand text-3xl text-ink">{partner?.name} is taking a photo… smile! {theirCount}</span></div>}
                  {flash && <div className="absolute inset-0 bg-white" />}
                  {busy && shots.length > 0 && <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-0.5 text-base text-ink">{shots.length} / {layout === "strip" ? 4 : 1}</span>}
                </div>

                {/* button + coin slot */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="hidden rounded-xl bg-[#EDE6DA] px-3 py-2 text-sm leading-snug text-[#4A2F25] sm:block">
                    <b>1.</b> Pick a look<br /><b>2.</b> Press the button<br /><b>3.</b> Smile! 😊
                  </div>
                  <button onClick={start} disabled={busy || !stream} aria-label={layout === "strip" ? "Take 4 photos" : "Take a photo"}
                    className="booth-button mx-auto flex flex-col items-center justify-center text-white disabled:opacity-60">
                    <Camera size={30} /><span className="text-sm font-semibold tracking-wider">{busy ? "SMILE" : "PRESS"}</span>
                  </button>
                  <div className="hidden flex-col items-center gap-1 sm:flex" aria-hidden>
                    <span className="h-14 w-4 rounded-full bg-black shadow-[inset_0_0_6px_#777]" />
                    <span className="text-[0.7rem] tracking-widest text-[#FFE08A]">INSERT ♥</span>
                  </div>
                </div>
              </div>
            </div>

            {/* control plate */}
            <div className="relative space-y-3 rounded-2xl border-4 border-[#CFC6B8] bg-paper p-4 text-ink shadow-soft">
              {[["left-2 top-2"], ["right-2 top-2"], ["left-2 bottom-2"], ["right-2 bottom-2"]].map(([p]) => <span key={p} className={`absolute ${p} h-2.5 w-2.5 rounded-full bg-ocean shadow-inner`} aria-hidden />)}
              <h2 className="text-center font-serif text-xl tracking-widest">CHOOSE YOUR STYLE</h2>
              <div>
                <p className="mb-1 text-sm">Who&apos;s in it</p>
                <div className="flex flex-wrap gap-2">
                  <button className={chip(!together)} onClick={() => setTogether(false)}>Just me</button>
                  <button className={chip(together)} onClick={() => setTogether(true)} disabled={!canTogether} title={canTogether ? "" : "Start a video call first"}>
                    Both of us {canTogether ? "" : "(call first)"}</button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm">Shape</p>
                <div className="flex gap-2"><button className={chip(layout === "strip")} onClick={() => setLayout("strip")}>Photo strip</button><button className={chip(layout === "single")} onClick={() => setLayout("single")}>Single</button></div>
              </div>
              <div>
                <p className="mb-1 text-sm">Look</p>
                <div className="flex flex-wrap gap-2">{FILTERS.map(f => <button key={f.id} className={chip(filter === f.id)} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
              </div>
              <div>
                <p className="mb-1 text-sm">Frame colour</p>
                <div className="flex flex-wrap gap-2">{THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id)} aria-label={t.label} title={t.label}
                    className={`h-9 w-9 rounded-full border-2 ${theme === t.id ? "border-ink" : "border-white"} shadow`} style={{ background: t.bg }} />))}</div>
              </div>
              <div>
                <p className="mb-1 text-sm">Stickers</p>
                <div className="flex flex-wrap gap-2">{Object.keys(STICKERS).map(k => <button key={k} className={chip(stickers === k)} onClick={() => setStickers(k)}>{STICKER_LABEL[k]}</button>)}</div>
              </div>
              <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={40} placeholder={`Caption (${me.name} & ${partner?.name ?? "…"})`}
                className="w-full rounded-2xl bg-white/85 px-4 py-2 text-lg outline-none focus:ring-2 focus:ring-rose" />
            </div>
          </div>

          {/* the slot where the strip comes out */}
          <div className="mx-auto mt-4 flex max-w-sm flex-col items-center">
            <div className="h-4 w-full rounded-full bg-black shadow-[inset_0_2px_6px_#555]" aria-hidden />
            <p className="mt-1 text-xs tracking-[0.3em] text-[#FFE08A]/80">PICTURES COME OUT HERE</p>
          </div>
        </div>
      </div>

      {result && (
        <section className="mx-auto -mt-1 max-w-4xl overflow-hidden rounded-b-[2rem] border-x-[14px] border-b-[14px] border-[#6B4030] bg-paper/90 p-5 shadow-soft">
          <h2 className="text-center text-2xl">Your pictures are ready ✨</h2>
          <div className="mt-3 flex flex-wrap items-start justify-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.url} alt="Your photo booth picture" key={result.url} className="booth-eject max-h-[70vh] rounded-xl shadow-soft" style={{ background: th.bg }} />
            <div className="flex flex-col gap-2">
              <button onClick={save} className="flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-lg text-white"><Save size={20} />Save to our album</button>
              <button onClick={download} className="flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-lg"><Download size={20} />Download</button>
              <button onClick={start} disabled={busy} className="flex items-center gap-2 rounded-full bg-powder px-6 py-2.5 text-lg"><RefreshCw size={20} />Retake</button>
              {note && <p className="max-w-[14rem] text-base">{note}</p>}
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-2xl">Our album 💞</h2>
        {album.length === 0 ? <p className="mt-2 font-hand text-2xl">Nothing here yet. Take your first strip!</p> : (
          <div className="mt-3 grid grid-cols-2 gap-3 @xl:grid-cols-3 @3xl:grid-cols-4">
            {album.map(a => (
              <button key={a.path} onClick={() => setBig(a.path)} className="overflow-hidden rounded-2xl border-4 border-white/80 bg-white/80 shadow-soft transition hover:-translate-y-1 hover:rotate-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="Saved picture" className="h-56 w-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </section>

      {big && (() => { const a = album.find(x => x.path === big); return a ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={() => setBig(null)}>
          <div className="max-h-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt="Saved picture" className="max-h-[80vh] rounded-xl" />
            <div className="mt-3 flex justify-center gap-3">
              <a href={a.url} download className="rounded-full bg-sage px-5 py-2 text-lg text-ink">Download</a>
              <button onClick={() => remove(a.path)} className="flex items-center gap-2 rounded-full bg-rose px-5 py-2 text-lg text-white"><Trash2 size={18} />Delete</button>
              <button onClick={() => setBig(null)} className="rounded-full bg-paper px-5 py-2 text-lg text-ink">Close</button>
            </div>
          </div>
        </div>) : null; })()}
    </main>
  );
}
