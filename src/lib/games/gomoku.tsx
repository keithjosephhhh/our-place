"use client";
import type { BaseState, GameDef, Seat } from "./types";

export const N = 15;
interface S extends BaseState { cells: (Seat | null)[]; last: number | null }

export function hasFive(cells: (Seat | null)[], i: number, seat: Seat) {
  const r = Math.floor(i / N), c = i % N;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let n = 1;
    for (const sgn of [1, -1]) {
      let rr = r + dr * sgn, cc = c + dc * sgn;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && cells[rr * N + cc] === seat) { n++; rr += dr * sgn; cc += dc * sgn; }
    }
    if (n >= 5) return true;
  }
  return false;
}

export const gomoku: GameDef<S, number> = {
  id: "gomoku", title: "Gomoku", category: "board", emoji: "⚫⚪",
  blurb: "Five in a row on a big board.",
  rules: "Take turns placing a stone on an intersection. The first to line up five in a row (any direction) wins.",
  init: () => ({ cells: Array(N * N).fill(null), last: null, turn: 0, winner: null, scores: [0, 0] }),
  apply(s, i, seat) {
    if (s.winner !== null || s.turn !== seat || i < 0 || i >= N * N || s.cells[i] !== null) return null;
    const cells = [...s.cells]; cells[i] = seat;
    const won = hasFive(cells, i, seat);
    const scores: [number, number] = [...s.scores]; if (won) scores[seat]++;
    return { cells, last: i, turn: (seat === 0 ? 1 : 0) as Seat, winner: won ? seat : cells.every(c => c !== null) ? "draw" : null, scores };
  },
  Board({ state, send }) {
    return (
      <div className="mx-auto w-full rounded-2xl bg-sage p-1.5 shadow-soft" style={{ maxWidth: "min(620px, calc(100vh - 20rem))" }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
          {state.cells.map((c, i) => (
            <button key={i} onClick={() => send(i)} aria-label={`Place at ${i}`}
              className="relative aspect-square border border-ink/10">
              {c !== null && (
                <span className={`absolute inset-[12%] rounded-full shadow ${c === 0 ? "bg-ink" : "bg-paper"} ${state.last === i ? "ring-2 ring-rose" : ""}`} />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  },
};
