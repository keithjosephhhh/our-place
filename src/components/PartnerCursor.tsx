"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSpace } from "./SpaceProvider";
import { useTheme } from "@/lib/useTheme";

interface Pos { x: number; y: number; path: string; at: number }

/**
 * Shows the other person's mouse pointer on your screen (and yours on theirs) while you're both on the same page.
 * Positions are sent as fractions of the window so different screen sizes still line up roughly.
 */
export function PartnerCursor() {
  const { channel, peer, partner } = useSpace();
  const { on, send } = channel;
  const path = usePathname();
  const th = useTheme();
  const [pos, setPos] = useState<Pos | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [enabled, setEnabled] = useState(true);
  const online = !!peer;
  const last = useRef(0);

  useEffect(() => { try { setEnabled(localStorage.getItem("showCursors") !== "0"); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const h = (e: Event) => setEnabled(!!(e as CustomEvent).detail);
    window.addEventListener("cursors-toggle", h);
    return () => window.removeEventListener("cursors-toggle", h);
  }, []);

  // send ours (at most ~25 times a second, only while the other person is here)
  useEffect(() => {
    if (!online || !enabled) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const t = performance.now(); if (t - last.current < 40) return; last.current = t;
      send("cursor", { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, path });
    };
    const down = (e: PointerEvent) => { if (e.pointerType !== "touch") send("cursor-click", { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, path }); };
    const leave = () => send("cursor", { x: -1, y: -1, path });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", down); document.documentElement.removeEventListener("mouseleave", leave); };
  }, [online, enabled, send, path]);

  // receive theirs
  useEffect(() => {
    const offs = [
      on("cursor", (p: { x: number; y: number; path: string }) => setPos({ ...p, at: Date.now() })),
      on("cursor-click", (p: { x: number; y: number; path: string }) => {
        const id = Date.now() + Math.random();
        setRipples(r => [...r, { id, x: p.x, y: p.y, path: p.path } as any]);
        setTimeout(() => setRipples(r => r.filter(q => q.id !== id)), 900);
      }),
    ];
    // test hook so the cursor can be previewed without a second person
    const fake = (e: Event) => setPos({ ...(e as CustomEvent).detail, at: Date.now() });
    window.addEventListener("fake-cursor", fake);
    return () => { offs.forEach(o => o()); window.removeEventListener("fake-cursor", fake); };
  }, [on]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  if (!enabled || !pos || pos.x < 0 || pos.path !== path || now - pos.at > 6000) {
    return ripples.length ? <Ripples list={ripples as any} path={path} /> : null;
  }
  return (
    <>
      <div className="pointer-events-none fixed z-[90]" aria-hidden
        style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transition: "left 70ms linear, top 70ms linear" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: "translate(-4px,-3px)", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.3))" }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={th.xmas ? "#2FBF71" : "#4FA3E0"} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span className="absolute left-5 top-6 whitespace-nowrap rounded-full px-2.5 py-0.5 font-hand text-lg text-white shadow-soft"
          style={{ background: th.xmas ? "#2A8F57" : "#3C8DD0" }}>{partner?.name ?? "♥"}</span>
      </div>
      <Ripples list={ripples as any} path={path} />
    </>
  );
}

function Ripples({ list, path }: { list: { id: number; x: number; y: number; path?: string }[]; path: string }) {
  return (
    <>
      {list.filter(r => !r.path || r.path === path).map(r => (
        <span key={r.id} className="cursor-ripple pointer-events-none fixed z-[90] text-2xl" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }} aria-hidden>💙</span>
      ))}
    </>
  );
}
