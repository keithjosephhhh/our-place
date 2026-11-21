"use client";
import type { BaseState, GameDef, Seat } from "./types";

interface S extends BaseState { cells: (Seat | null)[] }
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export const ticTacToe: GameDef<S, number> = {
  id: "tic-tac-toe", title: "Tic-Tac-Toe", category: "board", emoji: "✕○",
  blurb: "The classic. Three in a row wins.",
  rules: "Take turns placing your mark. First to line up three wins.",
  init: () => ({ cells: Array(9).fill(null), turn: 0, winner: null, scores: [0, 0] }),
  apply(s, i, seat) {
    if (s.winner !== null || s.turn !== seat || s.cells[i] !== null) return null;
    const cells = [...s.cells]; cells[i] = seat;
    const won = LINES.some(l => l.every(k => cells[k] === seat));
    const full = cells.every(c => c !== null);
    const scores: [number, number] = [...s.scores];
    if (won) scores[seat]++;
    return { cells, turn: (seat === 0 ? 1 : 0) as Seat, winner: won ? seat : full ? "draw" : null, scores };
  },
  Board({ state, send }) {
    return (
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto">
        {state.cells.map((c, i) => (
          <button key={i} onClick={() => send(i)}
            className="aspect-square rounded-2xl bg-paper shadow-soft text-5xl font-serif text-ink hover:bg-blush transition">
            {c === null ? "" : c === 0 ? "✕" : "○"}
          </button>
        ))}
      </div>
    );
  },
};
