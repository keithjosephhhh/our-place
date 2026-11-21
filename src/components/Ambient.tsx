// Soft drifting clouds and twinkles behind every page. Decorative, very quiet.
export function Ambient() {
  const clouds = [{ t: "10%", l: "-4%", w: 260, d: "70s" }, { t: "34%", l: "70%", w: 320, d: "95s" }, { t: "70%", l: "15%", w: 220, d: "80s" }];
  return (
    <div className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {clouds.map((c, i) => (
        <svg key={i} viewBox="0 0 200 70" className="absolute animate-drift" style={{ top: c.t, left: c.l, width: c.w, animationDuration: c.d, opacity: 0.55 }}>
          <g fill="#fff"><ellipse cx="60" cy="45" rx="55" ry="20" /><ellipse cx="105" cy="32" rx="42" ry="24" /><ellipse cx="145" cy="46" rx="42" ry="18" /></g>
        </svg>
      ))}
      {[[12, 20], [84, 14], [92, 62], [6, 78], [48, 90]].map(([x, y], i) => (
        <span key={i} className="absolute animate-twinkle text-rose" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.7}s` }}>✦</span>
      ))}
    </div>
  );
}
