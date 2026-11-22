"use client";
import { GameArt } from "./GameArt";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameDef, Seat } from "@/lib/games/types";
import { useSpace } from "./SpaceProvider";

/**
 * Generic synchronised room for any GameDef. Seat 0 = lower user id, seat 1 = higher,
 * so both clients derive the same seats without a server. State is applied locally
 * and broadcast; a `version` counter resolves ordering, and a peer joining late asks
 * for the current state (`game-sync-req`).
 */
export function GameRoom({ game, onLeave }: { game: GameDef<any, any>; onLeave: () => void }) {
  const { me, peer, partner, channel, call } = useSpace();
  const [state, setState] = useState(game.init());
  const version = useRef(0);

  // Preview mode: no partner is online, so one person plays both seats (hot-seat) to inspect the boards.
  const preview = process.env.NEXT_PUBLIC_PREVIEW === "1";
  const seat: Seat = preview
    ? (game.id === "rock-paper-scissors" ? (state.picks?.[0] ? 1 : 0) : state.turn)
    : partner && me.userId > partner.userId ? 1 : 0; // seat depends on the account pair, not on who's online
  const theirName = partner?.name ?? "…";
  const names: [string, string] = seat === 0 ? [me.name, theirName] : [theirName, me.name];

  useEffect(() => {
    const offs = [
      channel.on("game-move", p => {
        if (p.gameId !== game.id || p.version <= version.current) return;
        version.current = p.version; setState(p.state);
      }),
      channel.on("game-sync-req", p => {
        if (p.gameId === game.id) channel.send("game-move", { gameId: game.id, version: version.current, state });
      }),
      channel.on("game-reset", p => {
        if (p.gameId !== game.id) return;
        version.current = p.version; setState(p.state);
      }),
    ];
    return () => offs.forEach(o => o());
  }, [channel.on, channel.send, game.id, state]);

  // Ask once (not on every render) for the current state when entering a room.
  useEffect(() => { channel.send("game-sync-req", { gameId: game.id }); }, [channel.send, game.id]);

  const play = useCallback((move: unknown) => {
    const next = game.apply(state, move, seat);
    if (!next) return;
    version.current += 1; setState(next);
    channel.send("game-move", { gameId: game.id, version: version.current, state: next });
  }, [game, state, seat, channel]);

  const rematch = () => {
    const fresh = { ...game.init(), scores: state.scores, turn: state.winner === 0 ? 1 : 0 };
    version.current += 1; setState(fresh);
    channel.send("game-reset", { gameId: game.id, version: version.current, state: fresh });
  };

  const status = !peer && !preview ? `Waiting for ${theirName} to join…`
    : state.winner === "draw" ? "It's a draw"
    : state.winner !== null ? `${names[state.winner as number]} wins!`
    : game.id === "rock-paper-scissors" ? "Both pick at once"
    : state.turn === seat ? "Your turn" : `${names[state.turn]}'s turn`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-5">
      <section className="min-w-0 flex-[3_1_24rem] rounded-[2rem] bg-white/75 p-5 shadow-soft backdrop-blur sm:p-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-serif text-3xl text-ink"><GameArt id={game.id} className="mr-2 inline h-9 w-9 align-middle" />{game.title}</h2>
          <button onClick={onLeave} className="rounded-full bg-blush px-5 py-1.5 text-base">Leave game</button>
        </header>
        <p className="mb-5 rounded-2xl bg-powder/70 px-4 py-2 text-center font-hand text-3xl">{status}</p>
        <game.Board state={state} seat={seat} send={play} names={names} />
        {state.winner !== null && (
          <button onClick={rematch} className="mx-auto mt-6 block rounded-full bg-rose px-8 py-2.5 text-lg text-white shadow-soft">
            Rematch
          </button>
        )}
      </section>

      <aside className="min-w-0 flex-[1_1_15rem] space-y-4">
        <div className="rounded-[2rem] bg-blush/80 p-5 shadow-soft">
          <h3 className="font-serif text-xl">Scoreboard</h3>
          {[0, 1].map(i => (
            <div key={i} className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-2 ${state.turn === i && state.winner === null ? "bg-white" : "bg-white/50"}`}>
              <span className="text-lg">{names[i]}{names[i] === me.name ? " (you)" : ""}</span>
              <b className="font-serif text-3xl">{state.scores[i]}</b>
            </div>
          ))}
        </div>
        <div className="rounded-[2rem] bg-sage/70 p-5 shadow-soft">
          <h3 className="font-serif text-xl">How to play</h3>
          <p className="mt-2 text-base leading-relaxed">{game.rules}</p>
        </div>
        <div className="rounded-[2rem] bg-powder/70 p-5 text-base shadow-soft">
          {call.state === "idle"
            ? <>💡 Start a <b>video call</b> (top right) to see each other while you play.</>
            : <>💞 Open the <button className="underline" onClick={() => window.dispatchEvent(new Event("open-stage"))}>Together view</button> to doodle at each other mid-game.</>}
        </div>
      </aside>
    </div>
  );
}
