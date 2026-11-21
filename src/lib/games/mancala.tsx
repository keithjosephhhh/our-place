"use client";
import type { BaseState, GameDef, Seat } from "./types";

// pits[0..5] seat 0, pits[6] seat 0 store, pits[7..12] seat 1, pits[13] seat 1 store.
interface S extends BaseState { pits: number[]; note: string }

export const mancala: GameDef<S, number> = {
  id: "mancala", title: "Mancala", category: "board", emoji: "🥣",
  blurb: "Sow stones, capture, steal a turn.",
  rules: "Pick one of your pits and sow its stones counter-clockwise, one per pit, skipping your opponent's store. Ending in your store gives another turn. Ending in an empty pit of yours captures the stones opposite. The game ends when one side is empty; most stones in store wins.",
  init: () => ({ pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], note: "", turn: 0, winner: null, scores: [0, 0] }),
  apply(s, m, seat) {
    if (s.winner !== null || s.turn !== seat || m < 0 || m > 5) return null;
    const idx = seat * 7 + m;
    if (s.pits[idx] === 0) return null;
    const pits = [...s.pits];
    const own = seat * 7 + 6, opp = (1 - seat) * 7 + 6;
    let stones = pits[idx]; pits[idx] = 0;
    let pos = idx;
    while (stones > 0) { pos = (pos + 1) % 14; if (pos === opp) continue; pits[pos]++; stones--; }
    let note = "";
    const onOwnSide = pos >= seat * 7 && pos <= seat * 7 + 5;
    if (onOwnSide && pits[pos] === 1 && pits[12 - pos] > 0) {
      pits[own] += pits[12 - pos] + 1; pits[12 - pos] = 0; pits[pos] = 0; note = "Capture!";
    }
    let turn: Seat = pos === own ? seat : ((1 - seat) as Seat);
    if (pos === own) note = "Extra turn!";

    const side0 = pits.slice(0, 6).reduce((a, b) => a + b, 0);
    const side1 = pits.slice(7, 13).reduce((a, b) => a + b, 0);
    let winner: S["winner"] = null;
    const scores: [number, number] = [...s.scores];
    if (side0 === 0 || side1 === 0) {
      pits[6] += side0; pits[13] += side1;
      for (let k = 0; k < 6; k++) { pits[k] = 0; pits[7 + k] = 0; }
      winner = pits[6] === pits[13] ? "draw" : pits[6] > pits[13] ? 0 : 1;
      if (winner !== "draw") scores[winner]++;
      turn = seat;
    }
    return { pits, note, turn, winner, scores };
  },
  Board({ state, seat, send }) {
    const mine = seat * 7, theirs = (1 - seat) * 7;
    const pit = "grid h-14 w-14 place-items-center rounded-full text-xl shadow-inner sm:h-20 sm:w-20 sm:text-2xl";
    return (
      <div className="mx-auto w-fit rounded-[2rem] bg-[#E9D8C4] p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className={`${pit} h-28 bg-ocean/60 sm:h-44`} title="Their store">{state.pits[theirs + 6]}</div>
          <div className="space-y-3">
            <div className="flex gap-3">
              {[5, 4, 3, 2, 1, 0].map(m => <div key={m} className={`${pit} bg-paper/70`}>{state.pits[theirs + m]}</div>)}
            </div>
            <div className="flex gap-3">
              {[0, 1, 2, 3, 4, 5].map(m => (
                <button key={m} onClick={() => send(m)} className={`${pit} bg-paper hover:bg-blush`}>{state.pits[mine + m]}</button>
              ))}
            </div>
          </div>
          <div className={`${pit} h-28 bg-rose/60 sm:h-44`} title="Your store">{state.pits[mine + 6]}</div>
        </div>
        {state.note && <p className="mt-2 text-center font-hand text-xl">{state.note}</p>}
      </div>
    );
  },
};
