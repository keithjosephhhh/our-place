"use client";
import type { BaseState, GameDef, Seat } from "./types";

const R = 6, C = 7;
interface S extends BaseState { grid: (Seat | null)[][] } // grid[row][col], row 0 = top

function wins(g: (Seat | null)[][], seat: Seat) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
    let n = 0;
    while (n < 4) {
      const rr = r + dr * n, cc = c + dc * n;
      if (rr < 0 || rr >= R || cc < 0 || cc >= C || g[rr][cc] !== seat) break;
      n++;
    }
    if (n === 4) return true;
  }
  return false;
}

export const connectFour: GameDef<S, number> = {
  id: "connect-four", title: "Connect Four", category: "board", emoji: "🔴🟡",
  blurb: "Drop discs, line up four.",
  rules: "Drop a disc into a column. First to connect four in any direction wins.",
  init: () => ({ grid: Array.from({ length: R }, () => Array(C).fill(null)), turn: 0, winner: null, scores: [0, 0] }),
  apply(s, col, seat) {
    if (s.winner !== null || s.turn !== seat || col < 0 || col >= C) return null;
    let row = -1;
    for (let r = R - 1; r >= 0; r--) if (s.grid[r][col] === null) { row = r; break; }
    if (row < 0) return null;
    const grid = s.grid.map(r => [...r]); grid[row][col] = seat;
    const won = wins(grid, seat);
    const full = grid[0].every(c => c !== null);
    const scores: [number, number] = [...s.scores]; if (won) scores[seat]++;
    return { grid, turn: (seat === 0 ? 1 : 0) as Seat, winner: won ? seat : full ? "draw" : null, scores };
  },
  Board({ state, send }) {
    return (
      <div className="mx-auto w-fit rounded-3xl bg-ocean p-3 shadow-soft">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: C }).map((_, col) => (
            <button key={col} onClick={() => send(col)} className="flex flex-col gap-1.5">
              {state.grid.map((row, r) => (
                <span key={r} className={`h-10 w-10 sm:h-14 sm:w-14 rounded-full ${
                  row[col] === null ? "bg-paper" : row[col] === 0 ? "bg-rose" : "bg-[#E9D8A6]"}`} />
              ))}
            </button>
          ))}
        </div>
      </div>
    );
  },
};
