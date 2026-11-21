"use client";
import { useEffect, useRef } from "react";

export type Pt = [number, number];
export interface Stroke {
  id: string; by: string; kind: "pen" | "erase" | "stamp"; c: string; w: number; pts: Pt[]; emoji?: string;
}
export type StrokeMeta = Omit<Stroke, "pts">;
// Logical drawing space. Identical on both screens, so doodles line up on any device.
export const LW = 1600, LH = 800;

export interface CanvasApi {
  paint(s: Stroke, from: Pt | null, pts: Pt[]): void;
  redraw(): void;
  canvas(): HTMLCanvasElement | null;
}

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, from: Pt | null, pts: Pt[]) {
  ctx.save();
  if (s.kind === "stamp") {
    const p = pts[0]; if (p) {
      ctx.font = `${s.w * 6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.emoji ?? "❤️", p[0], p[1]);
    }
    ctx.restore(); return;
  }
  ctx.globalCompositeOperation = s.kind === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c;
  ctx.lineWidth = s.kind === "erase" ? s.w * 3 : s.w;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  let prev = from;
  for (const p of pts) {
    if (!prev) { ctx.beginPath(); ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    prev = p;
  }
  ctx.restore();
}

interface Props {
  active: boolean;
  tool: "pen" | "erase" | "stamp";
  color: string;
  size: number;
  emoji: string;
  me: string;
  strokes: React.MutableRefObject<Stroke[]>;
  apiRef: React.MutableRefObject<CanvasApi | null>;
  emit: (s: StrokeMeta, pts: Pt[]) => void;
}

export function DrawLayer({ active, tool, color, size, emoji, me, strokes, apiRef, emit }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const cur = useRef<{ stroke: Stroke; pending: Pt[]; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  useEffect(() => {
    const redraw = () => {
      const c = cv.current; if (!c) return;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, LW, LH);
      strokes.current.forEach(s => paintStroke(ctx, s, null, s.pts));
    };
    apiRef.current = {
      paint: (s, from, pts) => { const c = cv.current; if (c) paintStroke(c.getContext("2d")!, s, from, pts); },
      redraw, canvas: () => cv.current,
    };
    redraw();
    return () => { apiRef.current = null; };
  }, [apiRef, strokes]);

  const toPt = (e: React.PointerEvent): Pt => {
    const r = cv.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * LW), Math.round(((e.clientY - r.top) / r.height) * LH)];
  };
  const meta = (s: Stroke): StrokeMeta => ({ id: s.id, by: s.by, kind: s.kind, c: s.c, w: s.w, emoji: s.emoji });
  const flush = () => {
    const c = cur.current; if (!c) return;
    c.timer = null;
    if (!c.pending.length) return;
    emit(meta(c.stroke), c.pending); c.pending = [];
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPt(e);
    const stroke: Stroke = { id: crypto.randomUUID(), by: me, kind: tool, c: color, w: size, pts: [p], emoji: tool === "stamp" ? emoji : undefined };
    strokes.current.push(stroke);
    paintStroke(cv.current!.getContext("2d")!, stroke, null, [p]);
    if (tool === "stamp") { emit(meta(stroke), [p]); return; }
    cur.current = { stroke, pending: [p], timer: setTimeout(flush, 50) };
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = cur.current; if (!c) return;
    const p = toPt(e), last = c.stroke.pts[c.stroke.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
    paintStroke(cv.current!.getContext("2d")!, c.stroke, last, [p]);
    c.stroke.pts.push(p); c.pending.push(p);
    if (!c.timer) c.timer = setTimeout(flush, 50);
  };
  const up = () => {
    const c = cur.current; if (!c) return;
    if (c.timer) clearTimeout(c.timer);
    flush(); cur.current = null;
  };

  // The cursor shows the brush: a dot in the pen colour, a ring for the eraser, a "+" ring for stamps.
  const d = Math.min(60, Math.max(10, Math.round((tool === "erase" ? size * 3 : size) * 0.75)));
  const c = tool === "stamp" ? 26 : d + 4, r = d / 2;
  const inner = tool === "pen"
    ? `<circle cx='${c / 2}' cy='${c / 2}' r='${r}' fill='${color.replace("#", "%23")}' stroke='%234F4541' stroke-width='1.5'/>`
    : tool === "erase"
      ? `<circle cx='${c / 2}' cy='${c / 2}' r='${r}' fill='white' fill-opacity='0.5' stroke='%234F4541' stroke-width='1.5' stroke-dasharray='3 2'/>`
      : `<circle cx='${c / 2}' cy='${c / 2}' r='11' fill='white' fill-opacity='0.7' stroke='%23E0644A' stroke-width='2'/><path d='M${c / 2} ${c / 2 - 6}v12M${c / 2 - 6} ${c / 2}h12' stroke='%23E0644A' stroke-width='2' stroke-linecap='round'/>`;
  const size2 = tool === "stamp" ? 26 : c;
  const svgText = `<svg xmlns='http://www.w3.org/2000/svg' width='${size2}' height='${size2}'>${inner}</svg>`
    .replace(/</g, "%3C").replace(/>/g, "%3E"); // '#' is already written as %23 above
  const cursor = `url("data:image/svg+xml,${svgText}") ${size2 / 2} ${size2 / 2}, crosshair`;

  return (
    <canvas ref={cv} width={LW} height={LH}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={active ? { cursor } : undefined}
      className={`absolute inset-0 z-20 h-full w-full touch-none ${active ? "" : "pointer-events-none"}`} />
  );
}
