"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera, Clapperboard, Eraser, Heart, Maximize2, Mic, MicOff, Minimize2, MonitorOff, MonitorUp, Palette, Pencil, PhoneOff,
  Smile, Trash2, Undo2, Video, VideoOff,
} from "lucide-react";
import { useSpace } from "./SpaceProvider";
import { Dock } from "./Dock";
import { VideoFrame, HeartDefs } from "./VideoFrame";
import { StageScene } from "./StageScene";
import { DrawLayer, LH, LW, type CanvasApi, type Pt, type Stroke, type StrokeMeta } from "./DrawLayer";
import { FX_EMOJI, useFx, type FxKind } from "./FxLayer";
import {
  FILTERS, FILTER_CSS, FRAMES, FRAME_COLORS, PEN_COLORS, SCENES, STAMPS, loadStyle, type StageStyle,
} from "@/lib/stageStyle";

type Panel = "draw" | "style" | "love" | null;
type Tool = "pen" | "erase" | "stamp";

function useMedia(query: string) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h); h();
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}

/** The one place the partner's voice is played, so no matter how many video tiles are on screen there is no echo. */
function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const r = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (r.current) r.current.srcObject = stream; }, [stream]);
  return <audio ref={r} autoPlay />;
}

function ToolBtn({ on, onClick, icon, label, danger, disabled, title }: {
  on?: boolean; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean; disabled?: boolean; title?: string;
}) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={label} disabled={disabled} title={title ?? label}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition disabled:opacity-50 ${
        danger || on ? "bg-rose text-white" : "bg-white/90 hover:bg-blush"}`}>
      {icon}
    </button>
  );
}
function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`rounded-full px-4 py-1.5 text-base transition ${on ? "bg-rose text-white" : "bg-white/85 hover:bg-blush"}`}>{children}</button>
  );
}
const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

type ViewSize = "s" | "m" | "l";
type ViewLayout = "sides" | "right";
interface View { size: ViewSize; layout: ViewLayout }
const DEFAULT_VIEW: View = { size: "l", layout: "sides" };
const loadView = (): View => { try { return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem("callView") || "{}") }; } catch { return DEFAULT_VIEW; } };
const COL: Record<ViewSize, string> = { s: "clamp(13rem, 17vw, 21rem)", m: "clamp(15rem, 22vw, 28rem)", l: "clamp(17rem, 28vw, 36rem)" };
const COL_SHARING = "clamp(12rem, 19vw, 24rem)";

function StylePanel({ style, setStyle, view, setView }: {
  style: StageStyle; setStyle: (p: Partial<StageStyle>) => void; view: View; setView: (p: Partial<View>) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-2 rounded-3xl border-2 border-white/80 bg-paper/95 p-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-center gap-2"><span className="w-full text-center text-sm sm:w-auto">Layout (just for you)</span>
        <Chip on={view.layout === "sides"} onClick={() => setView({ layout: "sides" })}>▮ ▯ ▮ Both sides</Chip>
        <Chip on={view.layout === "right"} onClick={() => setView({ layout: "right" })}>▯ ▮ Stacked right</Chip>
        {(["s", "m", "l"] as ViewSize[]).map(z => <Chip key={z} on={view.size === z} onClick={() => setView({ size: z })}>{{ s: "Small", m: "Medium", l: "Big" }[z]} cameras</Chip>)}</div>
      <div className="flex flex-wrap items-center justify-center gap-2"><span className="w-full text-center text-sm sm:w-auto">Place</span>
        {SCENES.map(s => <Chip key={s.id} on={style.scene === s.id} onClick={() => setStyle({ scene: s.id })}>{s.emoji} {s.label}</Chip>)}</div>
      <div className="flex flex-wrap items-center justify-center gap-2"><span className="w-full text-center text-sm sm:w-auto">Frame</span>
        {FRAMES.map(f => <Chip key={f.id} on={style.frame === f.id} onClick={() => setStyle({ frame: f.id })}>{f.emoji} {f.label}</Chip>)}
        {FRAME_COLORS.map(c => <button key={c} onClick={() => setStyle({ color: c })} aria-label={`Frame colour ${c}`}
          className={`h-8 w-8 rounded-full border-2 ${style.color === c ? "border-ink" : "border-white"} shadow`} style={{ background: c }} />)}</div>
      <div className="flex flex-wrap items-center justify-center gap-2"><span className="w-full text-center text-sm sm:w-auto">Look</span>
        {FILTERS.map(f => <Chip key={f.id} on={style.filter === f.id} onClick={() => setStyle({ filter: f.id })}>{f.label}</Chip>)}</div>
      <div className="flex flex-wrap items-center justify-center gap-2"><span className="w-full text-center text-sm sm:w-auto">Camera</span>
        <Chip on={style.fit === "cover"} onClick={() => setStyle({ fit: "cover" })}>Fill the frame</Chip>
        <Chip on={style.fit === "contain"} onClick={() => setStyle({ fit: "contain" })}>Show the whole picture</Chip></div>
      <p className="text-center text-sm">These choices are shared, so you both see the same cozy room.</p>
    </div>
  );
}

/** "Watch together": the shared screen fills the middle (a blurred copy of it fills any spare edges, so there are no dark bars).
 *  In full screen our two cameras sit in a column on the right and a slim control bar runs along the bottom. */
function ScreenPanel({ stream, mine, who, tall, onStop, onShowPage, meNode, partnerNode, fsBar }: {
  stream: MediaStream; mine: boolean; who: string; tall: boolean; onStop: () => void; onShowPage: () => void;
  meNode: React.ReactNode; partnerNode: React.ReactNode; fsBar: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const bgv = useRef<HTMLVideoElement>(null);
  const [fs, setFs] = useState(false);
  const [vol, setVol] = useState(0.8);
  const [ratio, setRatio] = useState(16 / 9);
  // The panel takes the exact shape of whatever is shared (YouTube 16:9, a laptop screen 16:10, a phone…), so nothing is letterboxed.
  useEffect(() => {
    const v = vid.current; if (!v) return;
    const upd = () => { if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight); };
    v.addEventListener("loadedmetadata", upd); v.addEventListener("resize", upd); upd();
    return () => { v.removeEventListener("loadedmetadata", upd); v.removeEventListener("resize", upd); };
  }, [stream]);
  useEffect(() => { if (vid.current) vid.current.srcObject = stream; if (bgv.current) bgv.current.srcObject = stream; }, [stream]);
  useEffect(() => { if (vid.current) vid.current.volume = vol; }, [vol]);
  useEffect(() => {
    const h = () => setFs(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const pill = "rounded-full px-4 py-1 text-base shadow-soft";
  return (
    <section className="mx-2 mt-1">
      <div ref={box} className={`relative flex flex-col overflow-hidden bg-[#1B1722] ${fs ? "h-screen w-screen" : "mx-auto rounded-[2rem] shadow-soft"}`}
        style={fs ? undefined : { aspectRatio: String(ratio), width: tall ? `min(100%, calc((100vh - 7.5rem) * ${ratio}))` : "100%" }}>
        <video ref={bgv} autoPlay playsInline muted aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-3xl" />
        <div className="relative flex min-h-0 flex-1">
          <div className={`relative min-w-0 ${fs ? "shrink-0" : "flex-1"}`}
            style={fs ? { width: `min(calc((100vh - 4.5rem) * ${ratio}), calc(100vw - 12rem))`, aspectRatio: String(ratio), margin: "auto 0" } : undefined}>
            <video ref={vid} autoPlay playsInline muted={mine} className="h-full w-full object-contain" />
            <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-2 opacity-75 transition hover:opacity-100 focus-within:opacity-100">
              {!mine && <label className={`flex items-center gap-2 bg-paper/95 ${pill}`}>🔊
                <input type="range" min={0} max={1} step={0.05} value={vol} onChange={e => setVol(+e.target.value)} aria-label="Volume of the shared screen" className="w-24" /></label>}
              <button onClick={() => (fs ? document.exitFullscreen?.() : box.current?.requestFullscreen?.())} className={`bg-sage ${pill}`}>{fs ? "Exit full screen" : "Full screen"}</button>
              {!fs && <button onClick={onShowPage} className={`bg-powder ${pill}`}>Back to our page</button>}
              {mine && <button onClick={onStop} className={`bg-rose text-white ${pill}`}>Stop sharing</button>}
            </div>
            {!fs && <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-0.5 text-sm text-white">{mine ? `${who} sees your screen · use headphones` : `${who} is sharing`}</p>}
          </div>
          {fs && (
            <div className="flex min-w-[11rem] flex-1 flex-col gap-2 self-stretch p-2">
              <div className="min-h-0 flex-1">{meNode}</div>
              <div className="min-h-0 flex-1">{partnerNode}</div>
            </div>
          )}
        </div>
        {fs && <div className="relative flex shrink-0 items-center justify-center gap-2 bg-paper/90 py-2">{fsBar}</div>}
      </div>
    </section>
  );
}

/**
 * The call UI and page shell. While in a call the screen has our cameras as rectangles on the sides (Meet-style)
 * with the app, game or shared screen in the middle. The page itself is never remounted, so a game keeps going.
 */
export function CallDock({ children }: { children: React.ReactNode }) {
  const { call, partner, me, peer, channel } = useSpace();
  const sendFx = useFx();
  const { on, send } = channel;
  const wide = useMedia("(min-width: 1024px)");
  const [view, setViewState] = useState<View>(DEFAULT_VIEW);
  useEffect(() => setViewState(loadView()), []);
  const setView = (p: Partial<View>) => setViewState(v => { const n = { ...v, ...p }; try { localStorage.setItem("callView", JSON.stringify(n)); } catch { /* ignore */ } return n; });

  const [stageOpen, setStageOpen] = useState(false);
  const [style, setStyleState] = useState<StageStyle>(loadStyle);
  const styleRef = useRef(style); styleRef.current = style;
  const [panel, setPanel] = useState<Panel>(null);
  const [showStyle, setShowStyle] = useState(false);
  const [showLove, setShowLove] = useState(false);
  const [theater, setTheater] = useState(true);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[1]);
  const [size, setSize] = useState(12);
  const [emoji, setEmoji] = useState(STAMPS[0]);
  const [note, setNote] = useState<string | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const api = useRef<CanvasApi | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const localVid = useRef<HTMLVideoElement | null>(null);
  const remoteVid = useRef<HTMLVideoElement | null>(null);

  const inCall = call.state !== "idle";
  const screen = call.remoteScreen ?? call.localScreen;
  const screenMine = !call.remoteScreen && !!call.localScreen;

  // "Together for 12:03" + partner's clock
  const [since, setSince] = useState<number | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (call.state === "connected") setSince(s => s ?? Date.now());
    if (call.state === "idle") { setSince(null); setStageOpen(false); setPanel(null); setShowStyle(false); setShowLove(false); strokes.current = []; }
  }, [call.state]);
  // Cozy XP: one point for every minute we spend together on a call (kept on this device).
  useEffect(() => {
    if (call.state !== "connected") return;
    const i = setInterval(() => { try { localStorage.setItem("cozyXp", String(+(localStorage.getItem("cozyXp") || 0) + 1)); } catch { /* ignore */ } }, 60_000);
    return () => clearInterval(i);
  }, [call.state]);
  useEffect(() => { if (!inCall) return; const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i); }, [inCall]);
  // a new shared screen jumps to the middle automatically
  useEffect(() => { setTheater(true); }, [!!screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStyle = (patch: Partial<StageStyle>) => {
    const next = { ...styleRef.current, ...patch };
    setStyleState(next);
    try { localStorage.setItem("stageStyle", JSON.stringify(next)); } catch { /* ignore */ }
    send("stage-style", next);
  };

  // realtime: shared style + doodles
  useEffect(() => {
    const offs = [
      on("stage-style", (s: StageStyle) => setStyleState(s)),
      on("stage-style-req", () => send("stage-style", styleRef.current)),
      on("draw-seg", (p: { s: StrokeMeta; pts: Pt[] }) => {
        let st = strokes.current.find(x => x.id === p.s.id);
        const from = st ? st.pts[st.pts.length - 1] ?? null : null;
        if (!st) { st = { ...p.s, pts: [] }; strokes.current.push(st); }
        st.pts.push(...p.pts);
        api.current?.paint(st, from, p.pts);
      }),
      on("draw-clear", () => { strokes.current = []; api.current?.redraw(); }),
      on("draw-undo", (p: { id: string }) => { strokes.current = strokes.current.filter(x => x.id !== p.id); api.current?.redraw(); }),
      on("draw-req", () => send("draw-full", strokes.current.slice(-150))),
      on("draw-full", (all: Stroke[]) => { if (!strokes.current.length && Array.isArray(all)) { strokes.current = all; api.current?.redraw(); } }),
      on("rtc-join", () => send("stage-style", styleRef.current)),
    ];
    const open = () => setStageOpen(true);
    window.addEventListener("open-stage", open);
    return () => { offs.forEach(o => o()); window.removeEventListener("open-stage", open); };
  }, [on, send]);
  useEffect(() => {
    if (peer && inCall) { send("stage-style-req", {}); send("draw-req", {}); }
  }, [peer?.userId, inCall]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback((s: StrokeMeta, pts: Pt[]) => send("draw-seg", { s, pts }), [send]);
  const undo = () => {
    const idx = strokes.current.map(s => s.by).lastIndexOf(me.userId);
    if (idx < 0) return;
    const [r] = strokes.current.splice(idx, 1);
    api.current?.redraw(); send("draw-undo", { id: r.id });
  };
  const clearAll = () => { strokes.current = []; api.current?.redraw(); send("draw-clear", {}); };

  const toggleShare = async () => {
    if (call.localScreen) { call.stopShare(); return; }
    await call.shareScreen();
    setNote("To share sound, pick a Chrome tab and tick “Also share tab audio”. Headphones help.");
    setTimeout(() => setNote(null), 7000);
  };

  const snapshot = () => {
    const W = 1700, H = LH + 250, M = 50, pad = LW * 0.02, cellW = (LW - pad * 3) / 2, cellH = LH - pad * 2;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFD6E7"; ctx.fillRect(M, M, LW, LH);
    const cell = (v: HTMLVideoElement | null, x: number, mirror: boolean) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, M + pad, cellW, cellH); ctx.clip();
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, M + pad, cellW, cellH);
      if (v && v.videoWidth) {
        const vr = v.videoWidth / v.videoHeight, cr = cellW / cellH;
        let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
        if (vr > cr) { sw = sh * cr; sx = (v.videoWidth - sw) / 2; } else { sh = sw / cr; sy = (v.videoHeight - sh) / 2; }
        const f = FILTER_CSS[styleRef.current.filter];
        if ("filter" in ctx) ctx.filter = f || "none";
        if (mirror) { ctx.translate(x + cellW, M + pad); ctx.scale(-1, 1); ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cellW, cellH); }
        else ctx.drawImage(v, sx, sy, sw, sh, x, M + pad, cellW, cellH);
      }
      ctx.restore();
    };
    cell(localVid.current, M + pad, true);
    cell(remoteVid.current, M + pad * 2 + cellW, false);
    const draw = api.current?.canvas();
    if (draw) ctx.drawImage(draw, M, M, LW, LH);
    ctx.fillStyle = "#141218"; ctx.textAlign = "center"; ctx.font = "800 60px 'Bricolage Grotesque', sans-serif";
    ctx.fillText(`${me.name} & ${partner?.name ?? ""} · ${new Date().toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}`, W / 2, M + LH + 110);
    cv.toBlob(b => {
      if (!b) { setNote("Couldn't make the picture."); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `together-${new Date().toISOString().slice(0, 10)}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setNote("Saved to your downloads 💌");
    }, "image/png");
    setTimeout(() => setNote(null), 3500);
  };

  const partnerName = partner?.name ?? "them";
  const statusText = ({
    "requesting-media": "Asking for your camera…", waiting: `Waiting for ${partnerName}…`, connecting: "Connecting…",
    connected: "Together", failed: "Connection lost", idle: "",
  } as const)[call.state];
  const dot = call.state === "connected" ? "bg-green-500" : call.state === "failed" ? "bg-red-500" : "bg-amber-400";
  const there = partner ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: partner.timezone }) : "";

  const sharing = !!screen && theater;
  useEffect(() => { document.body.dataset.focus = sharing ? "1" : ""; return () => { document.body.dataset.focus = ""; }; }, [sharing]);
  const colW = sharing ? COL_SHARING : COL[view.size];
  const stacked = view.layout === "right" || sharing; // one camera column on the right (always while sharing)
  const tileAspect = sharing ? "min-h-0 flex-1" : "aspect-[4/3]";
  const xp = (() => { try { return +(localStorage.getItem("cozyXp") || 0); } catch { return 0; } })();

  const tileFrame = style.frame === "circle" || style.frame === "heart" ? "round" : style.frame; // rectangles suit a video-meeting layout
  const meTile = <VideoFrame stream={call.localStream} label={me.name} frame={style.frame} color={style.color} filter={style.filter} fit={style.fit} muted mirror camOff={!call.camOn} />;
  const partnerTile = <VideoFrame stream={call.remoteStream} label={partnerName} frame={style.frame} color={style.color} filter={style.filter} fit={style.fit} muted waitingText={`waiting for ${partnerName}…`} />;
  const meRect = <VideoFrame stream={call.localStream} label={me.name} frame={tileFrame} color={style.color} filter={style.filter} fit={style.fit} muted mirror camOff={!call.camOn} />;
  const partnerRect = <VideoFrame stream={call.remoteStream} label={partnerName} frame={tileFrame} color={style.color} filter={style.filter} fit={style.fit} muted waitingText={`waiting for ${partnerName}…`} />;

  const card = "rounded-3xl border-2 border-white/80 bg-paper/85 p-3 shadow-soft";
  const lvl = Math.floor(Math.sqrt(xp / 5)) + 1, lvlStart = 5 * (lvl - 1) ** 2, lvlEnd = 5 * lvl ** 2;
  const ReactionsCard = (
    <div className={card}>
      <p className="mb-2 text-center font-hand text-2xl">Send {partnerName} some love</p>
      <div className="grid grid-cols-5 gap-1.5">
        {(["hug", "kiss", "heart", "wave", "sparkle"] as FxKind[]).map(k => (
          <button key={k} onClick={() => sendFx(k)} aria-label={k} className="rounded-2xl bg-white/90 py-2 text-2xl hover:bg-blush">{FX_EMOJI[k]}</button>
        ))}
      </div>
    </div>
  );
  const TogetherCard = (
    <div className={card}>
      <div className="flex items-center justify-between text-base">
        <span>🕒 {there || "--:--"} for {partnerName}</span>
        <span className="rounded-full bg-butter px-3 py-0.5 text-sm">{statusText}</span>
      </div>
      <p className="mt-1 text-center font-serif text-3xl">{since ? fmt(Date.now() - since) : "0:00"} <span className="font-hand text-2xl">together</span></p>
      <div className="mt-2 flex items-center gap-2 text-sm"><span className="rounded-full bg-rose px-2 py-0.5 text-white">Lv {lvl}</span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/80"><span className="block h-full rounded-full bg-rose" style={{ width: `${Math.min(100, ((xp - lvlStart) / (lvlEnd - lvlStart)) * 100)}%` }} /></span>
        <span>✨ {xp}</span></div>
    </div>
  );
  const DoodleCard = (
    <button onClick={() => setStageOpen(true)} className="flex items-center justify-center gap-2 rounded-3xl bg-sage px-4 py-3 text-lg">🎨 Doodle on each other&apos;s faces</button>
  );

  const tile = (c: React.ReactNode) => <div className={`${tileAspect} w-full shrink-0`}>{c}</div>;
  const colCls = `sticky ${sharing ? "top-2 h-[calc(100vh-6.5rem)]" : "top-14 h-[calc(100vh-7.5rem)]"} flex min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:none]`;

  const controls = (
    <>
      <ToolBtn onClick={call.toggleMic} on={!call.micOn} icon={call.micOn ? <Mic size={22} /> : <MicOff size={22} />} label={call.micOn ? "Mute" : "Unmute"} />
      <ToolBtn onClick={call.toggleCam} on={!call.camOn} icon={call.camOn ? <Video size={22} /> : <VideoOff size={22} />} label={call.camOn ? "Camera off" : "Camera on"} />
      <ToolBtn onClick={toggleShare} on={!!call.localScreen} disabled={!!call.remoteScreen || !call.canShare}
        title={!call.canShare ? "Screen sharing needs a computer browser" : call.remoteScreen ? `${partnerName} is already sharing` : undefined}
        icon={call.localScreen ? <MonitorOff size={22} /> : <MonitorUp size={22} />} label={call.localScreen ? "Stop sharing" : "Share screen to watch together"} />
      {screen && <ToolBtn onClick={() => setTheater(t => !t)} on={theater} icon={<Clapperboard size={22} />} label={theater ? "Show our app" : "Show the shared screen"} />}
      <ToolBtn onClick={() => { setShowLove(l => !l); setShowStyle(false); }} on={showLove} icon={<Heart size={22} />} label="Send love" />
      <ToolBtn onClick={() => { setShowStyle(x => !x); setShowLove(false); }} on={showStyle} icon={<Palette size={22} />} label="Layout and style" />
      <ToolBtn onClick={() => setStageOpen(true)} icon={<Maximize2 size={22} />} label="Together view (doodles)" />
      <ToolBtn onClick={call.hangUp} danger icon={<PhoneOff size={22} />} label="End call" />
    </>
  );

  const fsControls = (
    <>
      <ToolBtn onClick={call.toggleMic} on={!call.micOn} icon={call.micOn ? <Mic size={22} /> : <MicOff size={22} />} label={call.micOn ? "Mute" : "Unmute"} />
      <ToolBtn onClick={call.toggleCam} on={!call.camOn} icon={call.camOn ? <Video size={22} /> : <VideoOff size={22} />} label={call.camOn ? "Camera off" : "Camera on"} />
      {screenMine && <ToolBtn onClick={call.stopShare} on icon={<MonitorOff size={22} />} label="Stop sharing" />}
      <ToolBtn onClick={() => document.exitFullscreen?.()} icon={<Minimize2 size={22} />} label="Exit full screen" />
      <ToolBtn onClick={call.hangUp} danger icon={<PhoneOff size={22} />} label="End call" />
    </>
  );

  const gridCols = !inCall || !wide ? undefined : stacked ? `minmax(0, 1fr) ${colW}` : `${colW} minmax(0, 1fr) ${colW}`;

  return (
    <>
      <RemoteAudio stream={call.remoteStream} />
      <HeartDefs />

      <div className={inCall && wide ? "grid min-h-screen" : ""} style={gridCols ? { gridTemplateColumns: gridCols } : undefined}>
        {inCall && wide && !stacked && (
          <aside className={colCls}>
            {tile(meRect)}
            {!sharing && ReactionsCard}
            {!sharing && DoodleCard}
          </aside>
        )}

        <div className={`min-w-0 pb-24 ${sharing ? "pt-2" : "pt-14"}`}>
          {inCall && !sharing && (
            <div className="sticky top-14 z-30 flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2 rounded-full border-2 border-white/80 bg-paper/95 px-4 py-0.5 text-base shadow-soft">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{statusText}{since ? ` · ${fmt(Date.now() - since)}` : ""}
                </span>
                {call.error && <p className="rounded-2xl bg-white/95 px-4 py-1 text-center text-base text-red-800 shadow-soft">{call.error}</p>}
                {note && <p className="rounded-2xl bg-white/95 px-4 py-1 text-center text-base shadow-soft">{note}</p>}
              </div>
            </div>
          )}

          {inCall && !wide && (
            <div className="mx-2 mt-2 grid grid-cols-2 gap-2">
              <div className="aspect-[4/3]">{meRect}</div><div className="aspect-[4/3]">{partnerRect}</div>
            </div>
          )}

          {sharing && screen ? (
            <ScreenPanel stream={screen} mine={screenMine} who={partnerName} tall={wide} onStop={call.stopShare}
              onShowPage={() => setTheater(false)} meNode={meRect} partnerNode={partnerRect} fsBar={fsControls} />
          ) : null}

          {/* Always mounted, only hidden: a game in progress survives starting a call or a movie. */}
          <div className={`@container ${sharing ? "hidden" : ""}`}>{children}</div>
        </div>

        {inCall && wide && (
          <aside className={colCls}>
            {stacked && tile(meRect)}
            {tile(partnerRect)}
            {!sharing && TogetherCard}
            {stacked && !sharing && ReactionsCard}
            {stacked && !sharing && DoodleCard}
          </aside>
        )}
      </div>

      {inCall && (showStyle || showLove) && (
        <div className="fixed inset-x-2 bottom-24 z-40">
          {showStyle && <StylePanel style={style} setStyle={setStyle} view={view} setView={setView} />}
          {showLove && (
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-white/80 bg-paper/95 p-3 shadow-soft">
              {(["hug", "kiss", "heart", "wave", "sparkle"] as FxKind[]).map(k => (
                <button key={k} onClick={() => sendFx(k)} className="flex flex-col items-center rounded-2xl bg-white/90 px-4 py-2 text-base hover:bg-blush">
                  <span className="text-3xl">{FX_EMOJI[k]}</span>{{ hug: "Hug", kiss: "Kiss", heart: "Love", wave: "Wave", sparkle: "Sparkle" }[k]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Dock controls={inCall ? controls : undefined} />

      {/* ---------------- Together view (big shared stage with doodles) ---------------- */}
      {inCall && stageOpen && (
        <div ref={rootRef} className="fixed inset-0 z-[55] flex flex-col overflow-hidden bg-paper text-ink">
          <StageScene scene={style.scene} />
          <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-3 font-hand text-3xl">
              {me.name} <Heart className="animate-beat fill-rose text-rose" /> {partnerName}
            </div>
            <div className="flex items-center gap-2 text-base">
              <span className="flex items-center gap-2 rounded-full bg-paper/90 px-4 py-1 shadow-soft">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{statusText}{since ? ` · ${fmt(Date.now() - since)}` : ""}
              </span>
              <button onClick={() => setStageOpen(false)} className="flex items-center gap-2 rounded-full bg-paper/90 px-4 py-1 shadow-soft">
                <Minimize2 size={18} /> Back to our place
              </button>
            </div>
          </header>

          <div className="relative z-10 min-h-0 flex-1 px-3" style={{ containerType: "size" }}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ aspectRatio: "2/1", width: "min(100cqw, 200cqh)" }}>
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-1 gap-[2%] p-[2%]">
                <div className="relative min-h-0">
                  <VideoFrame stream={call.localStream} label={me.name} frame={style.frame} color={style.color} filter={style.filter} fit={style.fit}
                    muted mirror camOff={!call.camOn} videoRef={localVid} />
                </div>
                <div className="relative min-h-0" style={{ cursor: "var(--cursor-pointer)" }} title={`Tap to send ${partnerName} a heart`}
                  onClick={e => {
                    if (panel === "draw") return;
                    sendFx("heart", (e.clientX / window.innerWidth) * 100, (e.clientY / window.innerHeight) * 100);
                  }}>
                  <VideoFrame stream={call.remoteStream} label={partnerName} frame={style.frame} color={style.color} filter={style.filter} fit={style.fit}
                    muted videoRef={remoteVid} waitingText={`waiting for ${partnerName}…`} />
                </div>
              </div>
              <Heart className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 animate-beat fill-rose text-rose drop-shadow" size={34} />
              <DrawLayer active={panel === "draw"} tool={tool} color={color} size={size} emoji={emoji} me={me.userId}
                strokes={strokes} apiRef={api} emit={emit} />
            </div>
          </div>

          <footer className="relative z-30 px-3 pb-3 pt-2">
            {call.error && <p className="mb-2 text-center text-base text-red-800">{call.error}</p>}
            {note && <p className="mb-2 text-center font-hand text-2xl">{note}</p>}

            {panel === "draw" && (
              <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-3xl bg-paper/95 p-3 shadow-soft">
                <Chip on={tool === "pen"} onClick={() => setTool("pen")}><Pencil size={16} className="mr-1 inline" />Pen</Chip>
                <Chip on={tool === "stamp"} onClick={() => setTool("stamp")}><Smile size={16} className="mr-1 inline" />Stamps</Chip>
                <Chip on={tool === "erase"} onClick={() => setTool("erase")}><Eraser size={16} className="mr-1 inline" />Eraser</Chip>
                {tool === "stamp"
                  ? STAMPS.map(s => <button key={s} onClick={() => setEmoji(s)} aria-label={`Stamp ${s}`} className={`rounded-full px-2 text-2xl ${emoji === s ? "bg-blush ring-2 ring-rose" : ""}`}>{s}</button>)
                  : PEN_COLORS.map(c => <button key={c} onClick={() => { setColor(c); if (tool === "erase") setTool("pen"); }} aria-label={`Colour ${c}`}
                      className={`h-8 w-8 rounded-full border-2 ${color === c && tool !== "erase" ? "border-ink" : "border-white"} shadow`} style={{ background: c }} />)}
                {[6, 12, 22].map(s => (
                  <button key={s} onClick={() => setSize(s)} aria-label={`Size ${s}`} className={`grid h-9 w-9 place-items-center rounded-full ${size === s ? "bg-blush ring-2 ring-rose" : "bg-white/80"}`}>
                    <span className="rounded-full bg-ink" style={{ width: s / 1.4 + 3, height: s / 1.4 + 3 }} />
                  </button>
                ))}
                <Chip onClick={undo}><Undo2 size={16} className="mr-1 inline" />Undo</Chip>
                <Chip onClick={clearAll}><Trash2 size={16} className="mr-1 inline" />Clear</Chip>
                <p className="w-full text-center text-sm">Whatever you draw, {partnerName} sees it live, and you can both draw at once.</p>
              </div>
            )}
            {panel === "style" && <div className="mb-2"><StylePanel style={style} setStyle={setStyle} view={view} setView={setView} /></div>}
            {panel === "love" && (
              <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-3xl bg-paper/95 p-3 shadow-soft">
                {(["hug", "kiss", "heart", "wave", "sparkle"] as FxKind[]).map(k => (
                  <button key={k} onClick={() => sendFx(k)} className="flex flex-col items-center rounded-2xl bg-white/85 px-4 py-2 text-base hover:bg-blush">
                    <span className="text-3xl">{FX_EMOJI[k]}</span>{{ hug: "Hug", kiss: "Kiss", heart: "Love", wave: "Wave", sparkle: "Sparkle" }[k]}
                  </button>
                ))}
              </div>
            )}

            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-3xl bg-paper/95 p-2 shadow-soft">
              <ToolBtn onClick={call.toggleMic} on={!call.micOn} icon={call.micOn ? <Mic size={22} /> : <MicOff size={22} />} label={call.micOn ? "Mic on" : "Muted"} />
              <ToolBtn onClick={call.toggleCam} on={!call.camOn} icon={call.camOn ? <Video size={22} /> : <VideoOff size={22} />} label={call.camOn ? "Camera on" : "Camera off"} />
              <ToolBtn onClick={() => setPanel(panel === "draw" ? null : "draw")} on={panel === "draw"} icon={<Pencil size={22} />} label="Doodle" />
              <ToolBtn onClick={() => setPanel(panel === "style" ? null : "style")} on={panel === "style"} icon={<Palette size={22} />} label="Style" />
              <ToolBtn onClick={() => setPanel(panel === "love" ? null : "love")} on={panel === "love"} icon={<Heart size={22} />} label="Send love" />
              <ToolBtn onClick={snapshot} icon={<Camera size={22} />} label="Snapshot" />
              <ToolBtn onClick={() => rootRef.current?.requestFullscreen?.()} icon={<Maximize2 size={22} />} label="Full screen" />
              <ToolBtn onClick={call.hangUp} danger icon={<PhoneOff size={22} />} label="End call" />
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
