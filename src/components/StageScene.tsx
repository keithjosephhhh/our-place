import type { SceneKind } from "@/lib/stageStyle";

const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 62, d: (i % 7) * 0.45, s: 2 + (i % 3) }));

/** Original illustrated backdrops for the Together view. Purely decorative. */
export function StageScene({ scene }: { scene: SceneKind }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {scene === "sunset" && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#FFF0A6 0%,#FFD6E7 48%,#F7CDBB 72%,#F3E6D3 100%)" }} />
          <div className="absolute bottom-[30%] left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#F8C9B8]" />
          <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[34%] w-full">
            <path d="M0 40 Q100 15 200 40 T400 40 T600 40 T800 40 L800 200 L0 200Z" fill="#DCCBFF" opacity="0.8" />
            <path d="M0 80 Q100 55 200 80 T400 80 T600 80 T800 80 L800 200 L0 200Z" fill="#FFF0A6" />
            <path d="M0 140 Q200 120 400 140 T800 140 L800 200 L0 200Z" fill="#F3E6D3" />
          </svg>
        </>
      )}
      {scene === "cabin" && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#FBE6CC 0%,#F6D6B8 55%,#EBC9A6 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 100%, rgba(255,214,150,.8), transparent 62%)" }} />
          <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[30%] w-full">
            {[20, 90, 170, 560, 640, 720].map((x, i) => (
              <polygon key={x} points={`${x},200 ${x + 40},${70 + (i % 3) * 20} ${x + 80},200`} fill="#A9BFA5" opacity={0.85} />
            ))}
          </svg>
          {STARS.slice(0, 10).map((s, i) => (
            <span key={i} className="absolute animate-twinkle rounded-full bg-[#FFE9B8]" style={{ left: `${s.x}%`, top: `${40 + (s.y % 40)}%`, width: 5, height: 5, animationDelay: `${s.d}s` }} />
          ))}
        </>
      )}
      {scene === "stars" && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#93A9C6 0%,#B8B5D8 58%,#F0D5E0 100%)" }} />
          {STARS.map((s, i) => (
            <span key={i} className="absolute animate-twinkle rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
          ))}
          <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[34%] w-full">
            <polygon points="0,200 0,120 120,50 230,130 340,70 470,150 600,60 720,130 800,90 800,200" fill="#7F95B0" />
            <polygon points="0,200 0,160 140,110 260,165 400,120 540,170 680,115 800,160 800,200" fill="#6F86A3" />
          </svg>
        </>
      )}
      {scene === "clouds" && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#CFE3EF 0%,#E8F0F4 55%,#FFFFFF 100%)" }} />
          {[{ t: "12%", l: "8%", d: "38s", w: 220 }, { t: "30%", l: "58%", d: "52s", w: 280 }, { t: "58%", l: "22%", d: "44s", w: 200 }].map((c, i) => (
            <svg key={i} viewBox="0 0 200 70" className="absolute animate-drift" style={{ top: c.t, left: c.l, width: c.w, animationDuration: c.d }}>
              <g fill="#fff" opacity="0.92"><ellipse cx="60" cy="45" rx="55" ry="20" /><ellipse cx="105" cy="32" rx="42" ry="24" /><ellipse cx="145" cy="46" rx="42" ry="18" /></g>
            </svg>
          ))}
        </>
      )}
      {scene === "picnic" && (
        <div className="absolute inset-0" style={{
          backgroundColor: "#FFFFFF",
          backgroundImage: "repeating-linear-gradient(0deg, rgba(217,174,187,.45) 0 34px, transparent 34px 68px), repeating-linear-gradient(90deg, rgba(217,174,187,.45) 0 34px, transparent 34px 68px)",
        }} />
      )}
    </div>
  );
}
