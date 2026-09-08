/** A small football mark used as the site logo. */
export default function FootballLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="League of Gangstars">
      <defs>
        <linearGradient id="fb-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9642b" />
          <stop offset="0.5" stopColor="#7a4319" />
          <stop offset="1" stopColor="#3f2110" />
        </linearGradient>
        <linearGradient id="fb-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e6a6" />
          <stop offset="1" stopColor="#b8931f" />
        </linearGradient>
        <radialGradient id="fb-spec" cx="0.35" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="rotate(-35 32 32)">
        <ellipse cx="32" cy="32" rx="30" ry="18" fill="url(#fb-skin)" stroke="url(#fb-gold)" strokeWidth="1.5" />
        <ellipse cx="32" cy="32" rx="30" ry="18" fill="url(#fb-spec)" />
        <path d="M8 32 Q32 22 56 32" stroke="url(#fb-gold)" strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M8 32 Q32 42 56 32" stroke="url(#fb-gold)" strokeWidth="1" fill="none" opacity="0.7" />
        <line x1="21" y1="32" x2="43" y2="32" stroke="#f3f4f8" strokeWidth="2.2" strokeLinecap="round" />
        {[25, 29, 33, 37, 41].map((x) => (
          <line key={x} x1={x} y1="28.5" x2={x} y2="35.5" stroke="#f3f4f8" strokeWidth="2" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
}
