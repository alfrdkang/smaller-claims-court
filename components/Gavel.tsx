import React from "react";

/** The court's gavel. `slam` triggers the strike animation on the head. */
export function Gavel({
  className = "",
  slam = false,
}: {
  className?: string;
  slam?: boolean;
}) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Gavel">
      <defs>
        <linearGradient id="gavel-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c08f2a" />
          <stop offset="45%" stopColor="#8a5834" />
          <stop offset="100%" stopColor="#4a2c1e" />
        </linearGradient>
        <linearGradient id="gavel-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0dfae" />
          <stop offset="100%" stopColor="#9c6f20" />
        </linearGradient>
      </defs>

      {/* Sound block */}
      <rect x="20" y="94" width="80" height="10" rx="3" fill="url(#gavel-brass)" opacity="0.85" />
      <rect x="28" y="88" width="64" height="7" rx="2.5" fill="url(#gavel-wood)" />

      <g
        className={slam ? "animate-gavel-slam" : ""}
        style={{ transformOrigin: "62px 78px" }}
      >
        {/* Handle */}
        <rect
          x="55"
          y="30"
          width="13"
          height="52"
          rx="6"
          fill="url(#gavel-wood)"
          transform="rotate(32 61 56)"
        />
        {/* Head */}
        <g transform="rotate(32 52 30)">
          <rect x="22" y="16" width="60" height="28" rx="7" fill="url(#gavel-wood)" />
          <rect x="22" y="16" width="9" height="28" rx="4" fill="url(#gavel-brass)" />
          <rect x="73" y="16" width="9" height="28" rx="4" fill="url(#gavel-brass)" />
        </g>
      </g>
    </svg>
  );
}
