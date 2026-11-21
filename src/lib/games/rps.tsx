"use client";
import type { BaseState, GameDef, Seat } from "./types";

type Pick = "rock" | "paper" | "scissors";
interface S extends BaseState { picks: [Pick | null, Pick | null]; last: string }
interface M { pick: Pick }
const BEATS: Record<Pick, Pick> = { rock: "scissors", paper: "rock", scissors: "paper" };
const ICON: Record<Pick, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

// Simultaneous-move game: `turn` is unused (both may pick); picks stay hidden until both are in.
export const rockPaperScissors: GameDef<S, M> = {
  id: "rock-paper-scissors", title: "Rock Paper Scissors", category: "party", emoji: "✊",
  blurb: "Pick in secret, reveal together.",
  rules: "Both pick secretly. Results reveal when both have chosen. Rock beats scissors, scissors beat paper, paper beats rock.",
  init: () => ({ picks: [null, null], last: "", turn: 0, winner: null, scores: [0, 0] }),
  apply(s, m, seat) {
    if (s.picks[seat] !== null && s.picks[1 - seat as Seat] !== null) return null;
    if (s.picks[seat] !== null) return null;
    const picks: [Pick | null, Pick | null] = [...s.picks]; picks[seat] = m.pick;
    if (picks[0] && picks[1]) {
      const scores: [number, number] = [...s.scores];
      let last = "Draw!";
      if (BEATS[picks[0]] === picks[1]) { scores[0]++; last = "Point for player 1"; }
      else if (BEATS[picks[1]] === picks[0]) { scores[1]++; last = "Point for player 2"; }
      return { picks: [null, null], last: `${ICON[picks[0]]} vs ${ICON[picks[1]]} — ${last}`, turn: 0, winner: null, scores };
    }
    return { ...s, picks };
  },
  Board({ state, seat, send }) {
    const mine = state.picks[seat];
    return (
      <div className="text-center space-y-4">
        <p className="font-hand text-2xl text-ink">{state.last || "Choose your move"}</p>
        <div className="flex justify-center gap-3">
          {(Object.keys(ICON) as Pick[]).map(p => (
            <button key={p} disabled={mine !== null} onClick={() => send({ pick: p })}
              className={`h-20 w-20 rounded-3xl text-4xl shadow-soft transition ${mine === p ? "bg-blush" : "bg-paper hover:bg-powder"}`}>
              {ICON[p]}
            </button>
          ))}
        </div>
        {mine && <p className="text-sm text-ink/70">Waiting for the other player…</p>}
      </div>
    );
  },
};
