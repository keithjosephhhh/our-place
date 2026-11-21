"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSpace } from "./SpaceProvider";

export type FxKind = "hug" | "kiss" | "heart" | "wave" | "sparkle";
export const FX_EMOJI: Record<FxKind, string> = { hug: "🤗", kiss: "😘", heart: "❤️", wave: "👋", sparkle: "✨" };
const LABEL: Record<FxKind, string> = {
  hug: "sent you a hug", kiss: "blew you a kiss", heart: "sent you love", wave: "waved at you", sparkle: "sent you sparkles",
};
interface Item { id: string; kind: FxKind; x: number; y: number; text?: string; dx: number[] }

/** Send a little burst of love: shows on my screen immediately and on my partner's via the channel. */
export function useFx() {
  const { channel, me } = useSpace();
  const send = channel.send;
  return useCallback((kind: FxKind, x = 50, y = 60) => {
    window.dispatchEvent(new CustomEvent("local-fx", { detail: { kind, x, y } }));
    send("fx", { kind, x, y, from: me.name });
  }, [send, me.name]);
}

export function FxLayer() {
  const { channel } = useSpace();
  const [items, setItems] = useState<Item[]>([]);
  const on = channel.on;

  const add = useCallback((kind: FxKind, x: number, y: number, from?: string) => {
    if (!(kind in FX_EMOJI)) return;
    const id = crypto.randomUUID();
    const dx = Array.from({ length: 6 }, () => (Math.random() - 0.5) * 160);
    setItems(c => [...c.slice(-20), { id, kind, x, y, dx, text: from ? `${from} ${LABEL[kind]}` : undefined }]);
    setTimeout(() => setItems(c => c.filter(i => i.id !== id)), 3400);
  }, []);

  useEffect(() => {
    const local = (e: Event) => { const d = (e as CustomEvent).detail; add(d.kind, d.x, d.y); };
    window.addEventListener("local-fx", local);
    const off = on("fx", p => add(p.kind, Number(p.x) || 50, Number(p.y) || 60, String(p.from ?? "")));
    return () => { window.removeEventListener("local-fx", local); off(); };
  }, [on, add]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-live="polite">
      {items.map(it => it.kind === "hug" || it.kind === "wave" ? (
        <div key={it.id} className="absolute inset-0 grid place-items-center">
          <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, times: [0, 0.2, 0.4, 1] }} className="text-center">
            <div className="text-[7rem] leading-none">{FX_EMOJI[it.kind]}</div>
            {it.text && <p className="mt-2 rounded-full bg-paper/95 px-5 py-1 font-hand text-2xl shadow-soft">{it.text}</p>}
          </motion.div>
        </div>
      ) : (
        <div key={it.id} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%` }}>
          {it.dx.map((d, i) => (
            <motion.span key={i} className="absolute text-4xl" initial={{ y: 0, x: 0, opacity: 0, scale: 0.4 }}
              animate={{ y: -220 - i * 18, x: d, opacity: [0, 1, 1, 0], scale: [0.4, 1.1, 1] }}
              transition={{ duration: 2.6, delay: i * 0.08, ease: "easeOut" }}>{FX_EMOJI[it.kind]}</motion.span>
          ))}
          {it.text && <p className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/95 px-4 py-0.5 font-hand text-xl shadow-soft">{it.text}</p>}
        </div>
      ))}
    </div>
  );
}
