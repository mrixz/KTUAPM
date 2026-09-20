import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
  onClick
}) => {
  const colorGradients = {
    indigo: {
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.25)',
      text: '#818cf8',
      gradient: 'var(--gradient-primary)'
    },
    cyan: {
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.25)',
      text: '#38bdf8',
      gradient: 'var(--gradient-cyan)'
    },
    emerald: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
      text: '#34d399',
      gradient: 'var(--gradient-emerald)'
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
      text: '#fbbf24',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
    }
  };

  const scheme = colorGradients[color] || colorGradients.indigo;

  return (
    <div
      className={`glass-card ${onClick ? 'glass-card-interactive' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        padding: '1.15rem'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '70px',
          height: '70px',
          background: scheme.bg,
          filter: 'blur(25px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, minWidth: 0 }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              background: scheme.bg,
              border: `1px solid ${scheme.border}`,
              padding: '0.45rem',
              borderRadius: 'var(--radius-md)',
              color: scheme.text,
              display: 'flex',
              flexShrink: 0
            }}
          >
            <Icon size={17} />
          </div>
        )}
      </div>
      <div>
        <div className="mono" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, wordBreak: 'break-word' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.35rem', lineHeight: 1.3 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

