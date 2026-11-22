// Original SVG scenery: mountains meeting a sunset beach. Purely decorative.
export function Scenery({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" className={`scenery ${className}`} aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF0A6" /><stop offset="0.65" stopColor="#FFD6E7" /><stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky)" />
      <circle cx="560" cy="170" r="42" fill="#FFD6E7" opacity="0.9" />
      <g fill="#fff" opacity="0.85" className="animate-drift">
        <ellipse cx="140" cy="60" rx="46" ry="12" /><ellipse cx="170" cy="52" rx="30" ry="12" />
        <ellipse cx="620" cy="88" rx="40" ry="10" /><ellipse cx="645" cy="80" rx="26" ry="10" />
      </g>
      <path d="M0 210 L120 120 L200 180 L320 90 L440 190 L520 150 L640 200 L800 140 L800 300 L0 300Z" fill="#DCCBFF" opacity="0.7" />
      <path d="M0 235 L90 170 L190 225 L300 160 L420 230 L560 180 L700 235 L800 200 L800 300 L0 300Z" fill="#CDEFD3" />
      <path d="M0 262 Q100 248 200 262 T400 262 T600 262 T800 262 L800 300 L0 300Z" fill="#FFF0A6" />
    </svg>
  );
}
