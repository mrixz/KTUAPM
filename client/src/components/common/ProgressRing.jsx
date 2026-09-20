import React from 'react';

/**
 * ProgressRing — SVG circular progress gauge
 * Props: value (number), max (number), size (px), strokeWidth, label, sublabel
 */
export const ProgressRing = ({
  value = 0,
  max = 100,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
  color = 'var(--accent-primary)',
}) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {/* Center label */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {label && (
          <div
            style={{
              fontSize: size > 120 ? '1.6rem' : '1.2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {label}
          </div>
        )}
        {sublabel && (
          <div
            style={{
              fontSize: size > 120 ? '0.75rem' : '0.65rem',
              color: 'var(--text-muted)',
              marginTop: '0.1rem',
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};
