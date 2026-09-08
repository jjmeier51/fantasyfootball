import clsx from "clsx";

interface Props {
  year: number;
  line1: string; // team name
  line2: string; // owner
  size?: number;
  glow?: boolean;
  dim?: boolean;
  className?: string;
}

/**
 * A Lombardi-style championship trophy: silver-white football on a tall, tapered
 * gold-accented pedestal with an engraved nameplate. Pure SVG so it stays crisp and light.
 */
export default function Trophy({ year, line1, line2, size = 220, glow, dim, className }: Props) {
  const id = `t${year}`;
  const w = size;
  const h = size * 1.45;
  const label1 = line1.length > 22 ? line1.slice(0, 21) + "…" : line1;
  return (
    <svg
      viewBox="0 0 200 290"
      width={w}
      height={h}
      className={clsx("transition-all duration-300", dim && "opacity-30 saturate-0", className)}
      role="img"
      aria-label={`${year} championship trophy: ${line1} (${line2})`}
    >
      <defs>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d9dde6" />
          <stop offset="0.6" stopColor="#9aa3b5" />
          <stop offset="1" stopColor="#5f6779" />
        </linearGradient>
        <linearGradient id={`${id}-silverV`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f7fb" />
          <stop offset="0.5" stopColor="#b8c0cf" />
          <stop offset="1" stopColor="#6b7385" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5c16" />
          <stop offset="0.25" stopColor="#f3dd8a" />
          <stop offset="0.5" stopColor="#c9a03a" />
          <stop offset="0.75" stopColor="#f6e6a6" />
          <stop offset="1" stopColor="#7a5c16" />
        </linearGradient>
        <linearGradient id={`${id}-goldV`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e6a6" />
          <stop offset="0.5" stopColor="#c9a03a" />
          <stop offset="1" stopColor="#7a5c16" />
        </linearGradient>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#162238" />
          <stop offset="1" stopColor="#07090d" />
        </linearGradient>
        <radialGradient id={`${id}-spec`} cx="0.35" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.4" r="0.5">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.40" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {glow && <ellipse cx="100" cy="120" rx="95" ry="120" fill={`url(#${id}-halo)`} />}

      <g filter={`url(#${id}-shadow)`}>
        {/* base */}
        <path d="M38 258 L162 258 L172 276 Q172 282 166 282 L34 282 Q28 282 28 276 Z" fill={`url(#${id}-goldV)`} />
        <rect x="42" y="250" width="116" height="10" rx="2" fill={`url(#${id}-gold)`} />
        <rect x="30" y="279" width="140" height="6" rx="3" fill="#3b2e0b" opacity="0.9" />

        {/* nameplate */}
        <rect x="52" y="212" width="96" height="36" rx="3" fill={`url(#${id}-plate)`} stroke={`url(#${id}-gold)`} strokeWidth="1.5" />

        {/* pedestal (tapered) */}
        <path d="M78 212 L122 212 L114 128 L86 128 Z" fill={`url(#${id}-silver)`} />
        <path d="M86 128 L114 128 L112 110 L88 110 Z" fill={`url(#${id}-silverV)`} />
        <path d="M84 112 L116 112 L118 104 L82 104 Z" fill={`url(#${id}-goldV)`} />
        {/* highlight on pedestal */}
        <path d="M90 210 L100 132 L104 132 L98 210 Z" fill="#ffffff" opacity="0.35" />

        {/* football holder arms */}
        <path d="M82 104 Q70 92 74 78 Q82 84 88 100 Z" fill={`url(#${id}-silverV)`} />
        <path d="M118 104 Q130 92 126 78 Q118 84 112 100 Z" fill={`url(#${id}-silverV)`} />

        {/* football (tilted, on its tip) */}
        <g transform="rotate(-28 100 62)">
          <ellipse cx="100" cy="62" rx="26" ry="46" fill={`url(#${id}-silver)`} stroke="#3f4657" strokeWidth="1" />
          <ellipse cx="100" cy="62" rx="26" ry="46" fill={`url(#${id}-spec)`} />
          {/* laces */}
          <line x1="100" y1="42" x2="100" y2="82" stroke="#3f4657" strokeWidth="2.2" strokeLinecap="round" />
          {[48, 55, 62, 69, 76].map((y) => (
            <line key={y} x1="94" y1={y} x2="106" y2={y} stroke="#3f4657" strokeWidth="2" strokeLinecap="round" />
          ))}
          {/* seams */}
          <path d="M83 30 Q100 30 117 30" stroke="#3f4657" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M83 94 Q100 94 117 94" stroke="#3f4657" strokeWidth="1.2" fill="none" opacity="0.6" />
        </g>
      </g>

      {/* engraving */}
      <text x="100" y="226" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#a7f3d0" fontFamily="var(--font-inter), system-ui, sans-serif" letterSpacing="0.3">
        {year} CHAMPION
      </text>
      <text x="100" y="237" textAnchor="middle" fontSize="7.5" fill="#e6e9f0" fontFamily="var(--font-inter), system-ui, sans-serif">
        {label1}
      </text>
      <text x="100" y="245" textAnchor="middle" fontSize="6.5" fill="#b6bdcc" fontFamily="var(--font-inter), system-ui, sans-serif">
        ({line2})
      </text>
    </svg>
  );
}
