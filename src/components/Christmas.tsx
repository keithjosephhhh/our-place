"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/useTheme";

const COLORS = ["#E5383B", "#F5B700", "#2FBF71", "#3A86FF", "#FF7AA2"];
const DECO = [
  { e: "🎄", left: "1.2%", size: "3.4rem" }, { e: "🎁", left: "5.5%" }, { e: "⛄", right: "1.2%", size: "3rem" }, { e: "🎁", right: "6%" },
];

/** Christmas mode: a string of twinkling lights, falling snow and a few decorations. Purely decorative. */
export function Christmas() {
  const { xmas } = useTheme();
  const [flakes, setFlakes] = useState<{ left: number; size: number; dur: number; delay: number; ch: string }[]>([]);
  useEffect(() => {
    setFlakes(Array.from({ length: 38 }, (_, i) => ({
      left: Math.random() * 100, size: 10 + Math.random() * 16, dur: 9 + Math.random() * 10, delay: -Math.random() * 18, ch: i % 5 === 0 ? "✻" : "❄",
    })));
  }, []);
  if (!xmas) return null;
  return (
    <div className="xmas" aria-hidden>
      <div className="xmas-wire" />
      <div className="xmas-lights">
        {Array.from({ length: 34 }, (_, i) => (
          <span key={i} className="bulb" style={{ color: COLORS[i % COLORS.length], animationDelay: `${(i % 7) * 0.35}s`, marginTop: i % 2 ? 2 : 6 }} />
        ))}
      </div>
      {flakes.map((f, i) => (
        <span key={i} className="flake" style={{ left: `${f.left}%`, fontSize: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, opacity: 0.55 + (i % 4) * 0.12 }}>{f.ch}</span>
      ))}
      {DECO.map((d, i) => (
        <span key={i} className="xmas-deco" style={{ left: d.left, right: d.right, fontSize: d.size }}>{d.e}</span>
      ))}
    </div>
  );
}
