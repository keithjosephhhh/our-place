/** Original illustrations for each game (inline SVG, palette-aware via CSS variables), used instead of emoji. */
const P = {
  pink: "rgb(var(--c-rose))", blue: "#5B8DEF", green: "#3FAE6A", yellow: "#F4C430", purple: "#8B5CF6", brown: "#9A6B4B",
  board: "rgb(var(--c-blush))", ink: "rgb(var(--c-ink))", paper: "rgb(var(--c-paper))",
};

function Board({ children, bg = P.board }: { children: React.ReactNode; bg?: string }) {
  return (
    <>
      <rect x="6" y="6" width="108" height="108" rx="20" fill={bg} stroke={P.ink} strokeOpacity=".2" strokeWidth="3" />
      {children}
    </>
  );
}

const ART: Record<string, React.ReactNode> = {
  "tic-tac-toe": (
    <Board bg="rgb(var(--c-powder))">
      <path d="M45 22v76M75 22v76M22 45h76M22 75h76" stroke={P.ink} strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 26l14 14M40 26L26 40" stroke={P.pink} strokeWidth="6" strokeLinecap="round" />
      <circle cx="60" cy="60" r="9" fill="none" stroke={P.blue} strokeWidth="6" />
      <path d="M80 80l14 14M94 80L80 94" stroke={P.pink} strokeWidth="6" strokeLinecap="round" />
      <circle cx="90" cy="30" r="9" fill="none" stroke={P.blue} strokeWidth="6" />
    </Board>
  ),
  "connect-four": (
    <Board bg={P.blue}>
      {[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => {
        const fill = (r * 4 + c) % 5 === 0 ? P.pink : (r + c) % 3 === 0 ? P.yellow : P.paper;
        return <circle key={`${r}${c}`} cx={28 + c * 21.3} cy={28 + r * 21.3} r="8.5" fill={r < 2 && fill === P.paper ? P.paper : fill} fillOpacity={fill === P.paper ? 0.9 : 1} />;
      }))}
    </Board>
  ),
  "rock-paper-scissors": (
    <Board bg="rgb(var(--c-butter))">
      <circle cx="38" cy="66" r="18" fill={P.brown} />
      <rect x="62" y="28" width="30" height="40" rx="6" fill={P.paper} stroke={P.ink} strokeOpacity=".4" strokeWidth="3" transform="rotate(12 77 48)" />
      <path d="M44 96l34-26M44 70l34 26" stroke={P.pink} strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="98" r="6" fill="none" stroke={P.purple} strokeWidth="4" /><circle cx="40" cy="68" r="6" fill="none" stroke={P.purple} strokeWidth="4" />
    </Board>
  ),
  gomoku: (
    <Board bg="rgb(var(--c-cocoa))">
      <path d="M26 26h68M26 46h68M26 66h68M26 86h68M26 26v68M46 26v68M66 26v68M86 26v68" stroke={P.ink} strokeOpacity=".4" strokeWidth="2" />
      {[[26, 26], [46, 46], [66, 66], [86, 86]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill={P.ink} />)}
      {[[46, 26], [66, 46], [86, 66]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill={P.paper} stroke={P.ink} strokeOpacity=".5" strokeWidth="2" />)}
    </Board>
  ),
  reversi: (
    <Board bg={P.green}>
      <path d="M60 22v76M22 60h76M41 22v76M79 22v76M22 41h76M22 79h76" stroke={P.ink} strokeOpacity=".25" strokeWidth="2" />
      <circle cx="50" cy="50" r="9" fill={P.paper} /><circle cx="70" cy="70" r="9" fill={P.paper} />
      <circle cx="70" cy="50" r="9" fill={P.ink} /><circle cx="50" cy="70" r="9" fill={P.ink} />
      <circle cx="30" cy="50" r="9" fill={P.ink} />
    </Board>
  ),
  mancala: (
    <Board bg="rgb(var(--c-cocoa))">
      <rect x="14" y="40" width="92" height="40" rx="20" fill={P.brown} />
      {[0, 1, 2, 3].map(i => <g key={i}><circle cx={36 + i * 16} cy="52" r="6" fill="rgba(0,0,0,.35)" /><circle cx={36 + i * 16} cy="68" r="6" fill="rgba(0,0,0,.35)" /></g>)}
      <ellipse cx="22" cy="60" rx="6" ry="14" fill="rgba(0,0,0,.35)" /><ellipse cx="98" cy="60" rx="6" ry="14" fill="rgba(0,0,0,.35)" />
      {[[52, 52, P.pink], [68, 68, P.yellow], [36, 68, P.blue], [98, 56, P.purple], [98, 64, P.green]].map(([x, y, c], i) => <circle key={i} cx={x as number} cy={y as number} r="3.6" fill={c as string} />)}
    </Board>
  ),
  "dots-and-boxes": (
    <Board bg="rgb(var(--c-ocean))">
      <rect x="30" y="30" width="30" height="30" fill={P.pink} fillOpacity=".5" />
      <path d="M30 30h60M30 60h60M30 90h30M30 30v60M60 30v60M90 30v30" stroke={P.ink} strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      {[30, 60, 90].flatMap(x => [30, 60, 90].map(y => <circle key={`${x}${y}`} cx={x} cy={y} r="5.5" fill={P.ink} />))}
    </Board>
  ),
};

const FALLBACK = (
  <Board><circle cx="40" cy="45" r="12" fill={P.pink} /><rect x="62" y="62" width="26" height="26" rx="6" fill={P.blue} /><path d="M30 90l12-18 12 18z" fill={P.yellow} /></Board>
);

export function GameArt({ id, className = "h-16 w-16" }: { id: string; className?: string }) {
  return <svg viewBox="0 0 120 120" role="img" aria-label={`${id} artwork`} className={className}>{ART[id] ?? FALLBACK}</svg>;
}
