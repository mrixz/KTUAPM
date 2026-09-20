import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

/**
 * CategoryProgressCard — student-friendly per-category progress card
 * Props: icon (emoji or string), name, description, earnedPoints, categoryCap,
 *        remainingCapacity, to (optional route link)
 */
export const CategoryProgressCard = ({
  icon,
  name,
  description,
  earnedPoints = 0,
  categoryCap = 0,
  remainingCapacity = 0,
  to,
}) => {
  const isFull = remainingCapacity <= 0;

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        borderColor: isFull ? 'var(--color-success-border)' : 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {icon && (
          <div
            className="cat-icon"
            style={{ background: 'var(--bg-surface)', fontSize: '1.35rem' }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            {name}
          </div>
          {description && (
            <p className="meta-text" style={{ marginTop: '0.2rem', lineHeight: 1.4 }}>
              {description}
            </p>
          )}
        </div>
        {isFull && (
          <CheckCircle2 size={16} color="var(--color-success-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
        )}
      </div>

      {/* Progress bar */}
      <div>
        <ProgressBar
          value={earnedPoints}
          max={categoryCap}
          height="6px"
          showPercentage={false}
          color={isFull ? '#10b981' : 'var(--gradient-primary)'}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.4rem',
            fontSize: '0.78rem',
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {earnedPoints} pts earned
          </span>
          <span style={{ color: isFull ? 'var(--color-success-text)' : 'var(--text-muted)' }}>
            {isFull ? 'Category full' : `${remainingCapacity} pts remaining`}
          </span>
        </div>
      </div>

      {/* Link */}
      {to && !isFull && (
        <Link
          to={to}
          className="link-accent"
          style={{
            fontSize: '0.82rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          See activities <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
};
