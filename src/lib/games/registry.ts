import type { ComingSoon, GameDef } from "./types";
import { ticTacToe } from "./tictactoe";
import { connectFour } from "./connect4";
import { rockPaperScissors } from "./rps";
import { gomoku } from "./gomoku";
import { reversi } from "./reversi";
import { mancala } from "./mancala";
import { dotsAndBoxes } from "./dots";

// Add a game: write a GameDef, push it here. The arcade, sync room and Date Night pick it up automatically.
export const PLAYABLE: GameDef<any, any>[] = [ticTacToe, connectFour, rockPaperScissors, gomoku, reversi, mancala, dotsAndBoxes];

export const COMING_SOON: ComingSoon[] = [
  { id: "chess", title: "Chess", category: "board", emoji: "♞", blurb: "Next up" },
  { id: "checkers", title: "Checkers", category: "board", emoji: "⛀", blurb: "Next up" },
  { id: "battleship", title: "Battleship", category: "board", emoji: "🚢", blurb: "Next up" },
  { id: "backgammon", title: "Backgammon", category: "board", emoji: "🎲", blurb: "Later" },
  { id: "ludo", title: "Ludo", category: "board", emoji: "🎯", blurb: "Later" },
  { id: "how-well", title: "How Well Do You Know Me?", category: "couple", emoji: "💭", blurb: "Phase 2" },
  { id: "would-you-rather", title: "Would You Rather?", category: "couple", emoji: "🤔", blurb: "Phase 2" },
  { id: "pictionary", title: "Pictionary", category: "party", emoji: "🎨", blurb: "Phase 2" },
];

export const CATEGORY_LABEL = {
  board: "Classic board games",
  couple: "Couple time",
  party: "Party games",
  mini: "Mini-games",
  challenge: "Couple challenges",
} as const;

export const getGame = (id: string) => PLAYABLE.find(g => g.id === id);
