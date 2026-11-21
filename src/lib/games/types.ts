// Reusable two-player game engine contract.
// A game is a pure reducer over a JSON state; the room layer syncs state between players.

export type Seat = 0 | 1;

export interface BaseState {
  turn: Seat;
  winner: Seat | "draw" | null;
  scores: [number, number];
}

export interface GameDef<S extends BaseState = BaseState, M = unknown> {
  id: string;
  title: string;
  category: "board" | "couple" | "party" | "mini" | "challenge";
  blurb: string;
  rules: string;
  emoji: string;
  init(): S;
  /** Returns the new state, or null if the move is illegal. */
  apply(state: S, move: M, seat: Seat): S | null;
  Board: React.ComponentType<{
    state: S;
    seat: Seat;
    send: (move: M) => void;
    names: [string, string];
  }>;
}

export interface ComingSoon {
  id: string;
  title: string;
  category: GameDef["category"];
  blurb: string;
  emoji: string;
}
