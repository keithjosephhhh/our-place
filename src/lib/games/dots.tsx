"use client";
import type { BaseState, GameDef, Seat } from "./types";

const B = 4; // 4x4 boxes, 5x5 dots
type Move = { t: "h" | "v"; r: number; c: number };
interface S extends BaseState {
  h: boolean[][];            // (B+1) rows x B cols
  v: boolean[][];            // B rows x (B+1) cols
  boxes: (Seat | null)[][];  // B x B owners
}
const grid = <T,>(r: number, c: number, v: T): T[][] => Array.from({ length: r }, () => Array(c).fill(v));
const done = (h: boolean[][], v: boolean[][], r: number, c: number) => h[r][c] && h[r + 1][c] && v[r][c] && v[r][c + 1];

export const dotsAndBoxes: GameDef<S, Move> = {
  id: "dots-and-boxes", title: "Dots and Boxes", category: "board", emoji: "🔲",
  blurb: "Close boxes, keep your turn.",
  rules: "Take turns drawing a line between two neighbouring dots. Completing a box claims it and gives you another turn. Most boxes wins.",
  init: () => ({ h: grid(B + 1, B, false), v: grid(B, B + 1, false), boxes: grid<Seat | null>(B, B, null), turn: 0, winner: null, scores: [0, 0] }),
  apply(s, m, seat) {
    if (s.winner !== null || s.turn !== seat) return null;
    const lim = m.t === "h" ? [B + 1, B] : [B, B + 1];
    if (m.r < 0 || m.c < 0 || m.r >= lim[0] || m.c >= lim[1]) return null;
    if ((m.t === "h" ? s.h : s.v)[m.r][m.c]) return null;
    const h = s.h.map(x => [...x]), v = s.v.map(x => [...x]), boxes = s.boxes.map(x => [...x]);
    (m.t === "h" ? h : v)[m.r][m.c] = true;
    const cand: [number, number][] = m.t === "h" ? [[m.r - 1, m.c], [m.r, m.c]] : [[m.r, m.c - 1], [m.r, m.c]];
    let gained = 0;
    for (const [r, c] of cand) {
      if (r < 0 || c < 0 || r >= B || c >= B || boxes[r][c] !== null) continue;
      if (done(h, v, r, c)) { boxes[r][c] = seat; gained++; }
    }
    const total = boxes.flat();
    const finished = total.every(b => b !== null);
    const a = total.filter(b => b === 0).length, b2 = total.filter(b => b === 1).length;
    const scores: [number, number] = [...s.scores];
    let winner: S["winner"] = null;
    if (finished) { winner = a === b2 ? "draw" : a > b2 ? 0 : 1; if (winner !== "draw") scores[winner]++; }
    return { h, v, boxes, scores, winner, turn: gained > 0 ? seat : ((1 - seat) as Seat) };
  },
  Board({ state, send }) {
    const G = 55, O = 20;
    const colour = (o: Seat | null) => (o === 0 ? "#D6307E" : "#DCCBFF");
    return (
      <svg viewBox="0 0 260 260" className="mx-auto w-full rounded-3xl bg-white/70 shadow-soft" style={{ maxWidth: "min(540px, calc(100vh - 20rem))" }}>
        {state.boxes.map((row, r) => row.map((o, c) => o !== null && (
          <rect key={`b${r}${c}`} x={O + c * G + 3} y={O + r * G + 3} width={G - 6} height={G - 6} rx={8} fill={colour(o)} opacity={0.8} />
        )))}
        {state.h.map((row, r) => row.map((on, c) => (
          <g key={`h${r}${c}`} onClick={() => send({ t: "h", r, c })} style={{ cursor: "var(--cursor-pointer)" }}>
            <line x1={O + c * G} y1={O + r * G} x2={O + (c + 1) * G} y2={O + r * G} stroke={on ? "#4A4455" : "#DCCBFF"} strokeOpacity={on ? 1 : 0.35} strokeWidth={on ? 4 : 3} strokeLinecap="round" />
            <line x1={O + c * G} y1={O + r * G} x2={O + (c + 1) * G} y2={O + r * G} stroke="transparent" strokeWidth={20} />
          </g>
        )))}
        {state.v.map((row, r) => row.map((on, c) => (
          <g key={`v${r}${c}`} onClick={() => send({ t: "v", r, c })} style={{ cursor: "var(--cursor-pointer)" }}>
            <line x1={O + c * G} y1={O + r * G} x2={O + c * G} y2={O + (r + 1) * G} stroke={on ? "#4A4455" : "#DCCBFF"} strokeOpacity={on ? 1 : 0.35} strokeWidth={on ? 4 : 3} strokeLinecap="round" />
            <line x1={O + c * G} y1={O + r * G} x2={O + c * G} y2={O + (r + 1) * G} stroke="transparent" strokeWidth={20} />
          </g>
        )))}
        {Array.from({ length: B + 1 }).map((_, r) => Array.from({ length: B + 1 }).map((_, c) => (
          <circle key={`d${r}${c}`} cx={O + c * G} cy={O + r * G} r={4.5} fill="#4A4455" />
        )))}
      </svg>
    );
  },
};
