"use client";
import { useEffect, useRef, useState } from "react";

export type Pt = { x: number; y: number };
export type FaceKind = "none" | "mustache" | "dog" | "cat" | "bunny" | "santa" | "antlers" | "crown" | "shades" | "flowers";
export const FACE_FILTERS: { id: FaceKind; label: string; icon: string }[] = [
  { id: "none", label: "No filter", icon: "✨" }, { id: "mustache", label: "Mustache", icon: "🥸" }, { id: "dog", label: "Puppy", icon: "🐶" },
  { id: "cat", label: "Kitty", icon: "🐱" }, { id: "bunny", label: "Bunny", icon: "🐰" }, { id: "santa", label: "Santa hat", icon: "🎅" },
  { id: "antlers", label: "Reindeer", icon: "🦌" }, { id: "crown", label: "Crown", icon: "👑" }, { id: "shades", label: "Shades", icon: "😎" },
  { id: "flowers", label: "Flower crown", icon: "🌼" },
];

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type FaceStatus = "idle" | "loading" | "ready" | "error";

/**
 * Finds a face in each video (about 15 times a second) and keeps the latest landmarks in a ref.
 * Landmarks are normalised 0..1 in the video's own frame. Works for one or two videos (together mode).
 * For testing without a camera, set window.__fakeFace to an array of landmarks.
 */
export function useFaceTracker(active: boolean, vids: React.RefObject<HTMLVideoElement>[]) {
  const lms = useRef<(Pt[] | null)[]>([null, null]);
  const [status, setStatus] = useState<FaceStatus>("idle");
  useEffect(() => {
    if (!active) { lms.current = [null, null]; return; }
    let stop = false;
    type LM = { detect: (v: HTMLVideoElement) => { faceLandmarks: Pt[][] }; close: () => void };
    const box: { lm: LM | null } = { lm: null };
    const fake = (window as unknown as { __fakeFace?: Pt[] }).__fakeFace;
    if (fake) { lms.current = [fake, fake]; setStatus("ready"); return; }
    setStatus("loading");
    (async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks(WASM);
        const make = (delegate: "GPU" | "CPU") => FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "IMAGE", numFaces: 1 });
        try { box.lm = (await make("GPU")) as unknown as LM; } catch { box.lm = (await make("CPU")) as unknown as LM; }
        if (stop) { box.lm?.close(); return; }
        setStatus("ready");
        let i = 0;
        const tick = () => {
          if (stop) return;
          const idx = i++ % vids.length; const v = vids[idx].current;
          if (v && v.videoWidth && v.readyState >= 2) {
            try {
              const r = box.lm!.detect(v).faceLandmarks[0];
              const prev = lms.current[idx];
              lms.current[idx] = r ? r.map((p, k) => (prev && prev[k] ? { x: prev[k].x * 0.4 + p.x * 0.6, y: prev[k].y * 0.4 + p.y * 0.6 } : { x: p.x, y: p.y })) : null;
            } catch { /* skip a frame */ }
          } else lms.current[idx] = null;
          setTimeout(tick, 33);
        };
        tick();
      } catch { if (!stop) setStatus("error"); }
    })();
    return () => { stop = true; box.lm?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vids.length]);
  return { lms, status };
}

/** Maps a normalised video point into a destination rectangle, the same way object-fit: cover (and mirroring) does. */
export function makeMapper(vw: number, vh: number, x: number, y: number, w: number, h: number, mirror: boolean) {
  const vr = vw / vh, cr = w / h;
  let sw = vw, sh = vh, sx = 0, sy = 0;
  if (vr > cr) { sw = sh * cr; sx = (vw - sw) / 2; } else { sh = sw / cr; sy = (vh - sh) / 2; }
  return (p: Pt): Pt => {
    const u = (p.x * vw - sx) / sw, v = (p.y * vh - sy) / sh;
    return { x: x + (mirror ? 1 - u : u) * w, y: y + v * h };
  };
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Draws one filter onto a face. `lm` are the face landmarks already mapped to canvas pixels. */
export function drawFilter(ctx: CanvasRenderingContext2D, kind: FaceKind, lm: Pt[]) {
  if (kind === "none" || lm.length < 400) return;
  const L = lm[234], R = lm[454], top = lm[10], chin = lm[152], nose = lm[1];
  const W = dist(L, R), H = dist(top, chin);
  if (!W || !H) return;
  const roll = Math.atan2(R.y - L.y, R.x - L.x);
  const local = (p: Pt, fn: () => void) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(roll); fn(); ctx.restore(); };
  const line = (w: number, c: string) => { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = "round"; ctx.lineJoin = "round"; };
  const eyeL = mid(lm[33], lm[133]), eyeR = mid(lm[362], lm[263]);
  const lipTop = lm[0], mouthOpen = dist(lm[13], lm[14]) / H;

  switch (kind) {
    case "mustache": {
      const a = mid(lm[2], lipTop);
      local(a, () => {
        ctx.fillStyle = "#3A2418";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, -0.02 * W);
          ctx.bezierCurveTo(s * 0.1 * W, -0.1 * W, s * 0.3 * W, -0.07 * W, s * 0.36 * W, 0.04 * W);
          ctx.bezierCurveTo(s * 0.4 * W, 0.12 * W, s * 0.3 * W, 0.12 * W, s * 0.27 * W, 0.07 * W);
          ctx.bezierCurveTo(s * 0.2 * W, 0.03 * W, s * 0.1 * W, 0.08 * W, 0, 0.08 * W);
          ctx.closePath(); ctx.fill();
        }
      });
      break;
    }
    case "dog": {
      local(top, () => {
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * 0.5 * W, 0.12 * W); ctx.rotate(s * 0.35);
          ctx.fillStyle = "#8A5A3C"; ctx.beginPath(); ctx.ellipse(0, 0.2 * W, 0.17 * W, 0.34 * W, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#C28D68"; ctx.beginPath(); ctx.ellipse(0, 0.22 * W, 0.09 * W, 0.22 * W, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
      local(nose, () => {
        ctx.fillStyle = "#1B1216"; ctx.beginPath(); ctx.ellipse(0, 0, 0.1 * W, 0.075 * W, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-0.03 * W, -0.02 * W, 0.025 * W, 0.015 * W, 0, 0, Math.PI * 2); ctx.fill();
      });
      if (mouthOpen > 0.04) {
        const len = 0.28 * W * Math.min(1, mouthOpen * 6);
        local(lm[14], () => {
          ctx.fillStyle = "#F0668F"; ctx.beginPath(); ctx.moveTo(-0.09 * W, 0);
          ctx.quadraticCurveTo(-0.1 * W, len, 0, len); ctx.quadraticCurveTo(0.1 * W, len, 0.09 * W, 0); ctx.closePath(); ctx.fill();
          line(0.012 * W, "#C43A68"); ctx.beginPath(); ctx.moveTo(0, 0.02 * W); ctx.lineTo(0, len * 0.7); ctx.stroke();
        });
      }
      break;
    }
    case "cat": {
      local(top, () => {
        for (const s of [-1, 1]) {
          ctx.fillStyle = "#3B3340"; ctx.beginPath(); ctx.moveTo(s * 0.12 * W, 0.18 * W); ctx.lineTo(s * 0.52 * W, 0.12 * W); ctx.lineTo(s * 0.4 * W, -0.38 * W); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#F59AB8"; ctx.beginPath(); ctx.moveTo(s * 0.2 * W, 0.1 * W); ctx.lineTo(s * 0.44 * W, 0.08 * W); ctx.lineTo(s * 0.38 * W, -0.22 * W); ctx.closePath(); ctx.fill();
        }
      });
      local(nose, () => {
        ctx.fillStyle = "#F0668F"; ctx.beginPath(); ctx.moveTo(-0.05 * W, -0.02 * W); ctx.lineTo(0.05 * W, -0.02 * W); ctx.lineTo(0, 0.04 * W); ctx.closePath(); ctx.fill();
        line(0.012 * W, "rgba(255,255,255,.9)");
        for (const s of [-1, 1]) for (const dy of [-0.04, 0.02, 0.08]) { ctx.beginPath(); ctx.moveTo(s * 0.14 * W, dy * W); ctx.lineTo(s * 0.5 * W, (dy * 1.8 - 0.02) * W); ctx.stroke(); }
      });
      break;
    }
    case "bunny": {
      local(top, () => {
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * 0.22 * W, 0); ctx.rotate(s * 0.12);
          ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 0.012 * W;
          ctx.beginPath(); ctx.ellipse(0, -0.45 * W, 0.12 * W, 0.46 * W, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#FFB3CC"; ctx.beginPath(); ctx.ellipse(0, -0.42 * W, 0.06 * W, 0.34 * W, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
      break;
    }
    case "santa": {
      local(top, () => {
        ctx.fillStyle = "#D6203A"; ctx.beginPath(); ctx.moveTo(-0.52 * W, 0.1 * W);
        ctx.bezierCurveTo(-0.5 * W, -0.45 * W, -0.1 * W, -0.7 * W, 0.45 * W, -0.52 * W);
        ctx.bezierCurveTo(0.5 * W, -0.2 * W, 0.52 * W, 0, 0.52 * W, 0.1 * W); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect(-0.58 * W, -0.04 * W, 1.16 * W, 0.2 * W, 0.1 * W); ctx.fill();
        ctx.beginPath(); ctx.arc(0.48 * W, -0.54 * W, 0.1 * W, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case "antlers": {
      local(top, () => {
        line(0.05 * W, "#8A5A3C");
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * 0.3 * W, 0.12 * W); ctx.quadraticCurveTo(s * 0.45 * W, -0.2 * W, s * 0.38 * W, -0.5 * W); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s * 0.4 * W, -0.15 * W); ctx.lineTo(s * 0.58 * W, -0.3 * W); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s * 0.42 * W, -0.35 * W); ctx.lineTo(s * 0.22 * W, -0.45 * W); ctx.stroke();
        }
      });
      local(nose, () => {
        ctx.fillStyle = "#E5243B"; ctx.beginPath(); ctx.arc(0, 0, 0.09 * W, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(-0.03 * W, -0.03 * W, 0.025 * W, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case "crown": {
      local(top, () => {
        const y0 = 0.08 * W, h = 0.36 * W, w = 0.5 * W;
        ctx.fillStyle = "#F4C430"; ctx.strokeStyle = "#B8860B"; ctx.lineWidth = 0.015 * W;
        ctx.beginPath(); ctx.moveTo(-w, y0); ctx.lineTo(-w, y0 - h * 0.7); ctx.lineTo(-w / 2, y0 - h * 0.35); ctx.lineTo(0, y0 - h);
        ctx.lineTo(w / 2, y0 - h * 0.35); ctx.lineTo(w, y0 - h * 0.7); ctx.lineTo(w, y0); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (const [x, c] of [[-0.3, "#E5578A"], [0, "#5B8DEF"], [0.3, "#3FAE6A"]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x * W, y0 - 0.09 * W, 0.04 * W, 0, Math.PI * 2); ctx.fill(); }
      });
      break;
    }
    case "shades": {
      local(mid(eyeL, eyeR), () => {
        const sep = dist(eyeL, eyeR), lw = 0.4 * W, lh = 0.26 * W;
        ctx.fillStyle = "rgba(20,16,26,.92)"; line(0.03 * W, "#14101A");
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * sep / 2 - lw / 2, -lh / 2, lw, lh, 0.08 * W); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(-sep / 2 + lw / 2 - 0.02 * W, -0.04 * W); ctx.quadraticCurveTo(0, -0.1 * W, sep / 2 - lw / 2 + 0.02 * W, -0.04 * W); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.22)";
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * sep / 2 - lw / 2 + 0.04 * W, -lh / 2 + 0.03 * W, lw * 0.3, 0.05 * W, 0.02 * W); ctx.fill(); }
      });
      break;
    }
    case "flowers": {
      local(top, () => {
        const cols = ["#F26DA5", "#FFD166", "#B79CFF", "#7FD1AE", "#8EC5FF"];
        for (let i = 0; i < 9; i++) {
          const t = i / 8, x = (t - 0.5) * 1.05 * W, y = 0.1 * W - Math.sin(t * Math.PI) * 0.1 * W;
          const r = 0.07 * W;
          ctx.fillStyle = cols[i % cols.length];
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.2566) * r, y + Math.sin(k * 1.2566) * r, r * 0.7, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#FFF3B0"; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
        }
      });
      break;
    }
  }
}
