"use client";
import type { BaseState, GameDef, Seat } from "./types";

type Cells = (Seat | null)[];
interface S extends BaseState { cells: Cells; note: string }
const DIRS = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b])).filter(([a, b]) => a || b);

export function flips(cells: Cells, i: number, seat: Seat): number[] {
  if (cells[i] !== null) return [];
  const r = Math.floor(i / 8), c = i % 8, out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && cells[rr * 8 + cc] === 1 - seat) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && cells[rr * 8 + cc] === seat) out.push(...line);
  }
  return out;
}
const hasMove = (cells: Cells, seat: Seat) => cells.some((_, i) => flips(cells, i, seat).length > 0);
const count = (cells: Cells, seat: Seat) => cells.filter(c => c === seat).length;

export const reversi: GameDef<S, number> = {
  id: "reversi", title: "Reversi", category: "board", emoji: "⚫⚪",
  blurb: "Flip the board to your colour.",
  rules: "Place a disc so it traps a line of your opponent's discs between yours; they flip. If you can't move, your turn is skipped. Most discs when the board is full or nobody can move wins.",
  init() {
    const cells: Cells = Array(64).fill(null);
    cells[27] = 1; cells[36] = 1; cells[28] = 0; cells[35] = 0;
    return { cells, note: "", turn: 0, winner: null, scores: [0, 0] };
  },
  apply(s, i, seat) {
    if (s.winner !== null || s.turn !== seat || i < 0 || i >= 64) return null;
    const f = flips(s.cells, i, seat);
    if (!f.length) return null;
    const cells = [...s.cells]; cells[i] = seat; f.forEach(k => (cells[k] = seat));
    const opp = (1 - seat) as Seat;
    let turn: Seat = seat, note = "", winner: S["winner"] = null;
    const scores: [number, number] = [...s.scores];
    if (hasMove(cells, opp)) turn = opp;
    else if (hasMove(cells, seat)) note = "No moves for the other player — they pass.";
    else {
      const a = count(cells, 0), b = count(cells, 1);
      winner = a === b ? "draw" : a > b ? 0 : 1;
      if (winner !== "draw") scores[winner]++;
    }
    return { cells, note, turn, winner, scores };
  },
  Board({ state, seat, send }) {
    const mine = state.turn === seat && state.winner === null;
    return (
      <div className="mx-auto w-full" style={{ maxWidth: "min(580px, calc(100vh - 21rem))" }}>
        <div className="grid grid-cols-8 gap-0.5 rounded-2xl bg-sage p-1.5 shadow-soft">
          {state.cells.map((c, i) => {
            const legal = mine && c === null && flips(state.cells, i, seat).length > 0;
            return (
              <button key={i} onClick={() => send(i)} className="relative aspect-square rounded bg-sage/60">
                {c !== null && <span className={`absolute inset-[10%] rounded-full shadow transition ${c === 0 ? "bg-ink" : "bg-paper"}`} />}
                {legal && <span className="absolute inset-[38%] rounded-full bg-rose/70" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-sm">⚫ {count(state.cells, 0)} · ⚪ {count(state.cells, 1)} {state.note && `— ${state.note}`}</p>
      </div>
    );
  },
};
