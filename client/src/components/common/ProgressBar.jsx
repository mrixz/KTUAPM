import React from 'react';

export const ProgressBar = ({
  value = 0,
  max = 100,
  label,
  subLabel,
  color = 'var(--gradient-primary)',
  height = '8px',
  showPercentage = true
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));

  return (
    <div style={{ width: '100%' }}>
      {(label || showPercentage) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.4rem',
            fontSize: '0.85rem'
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {label} {subLabel && <span style={{ color: 'var(--text-muted)' }}>({subLabel})</span>}
          </span>
          {showPercentage && (
            <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {value} / {max} <span style={{ color: 'var(--text-muted)' }}>({percentage}%)</span>
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
    </div>
  );
};
