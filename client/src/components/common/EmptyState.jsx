import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState — student-friendly empty state
 * Props: icon (lucide element), title, body, ctaLabel, ctaTo, ctaOnClick, secondaryLabel, secondaryTo
 */
export const EmptyState = ({
  icon,
  title,
  body,
  ctaLabel,
  ctaTo,
  ctaOnClick,
  secondaryLabel,
  secondaryTo,
}) => (
  <div className="empty-state animate-fade-in">
    {icon && (
      <div className="empty-state-icon" style={{ margin: '0 auto 1.1rem' }}>
        {icon}
      </div>
    )}
    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>{title}</h3>
    {body && (
      <p className="body-text" style={{ maxWidth: '380px', margin: '0 auto 1.5rem' }}>
        {body}
      </p>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      {ctaLabel && (
        ctaTo ? (
          <Link to={ctaTo} className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            {ctaLabel}
          </Link>
        ) : (
          <button onClick={ctaOnClick} className="btn btn-primary btn-lg">
            {ctaLabel}
          </button>
        )
      )}
      {secondaryLabel && (
        secondaryTo ? (
          <Link to={secondaryTo} className="link-accent" style={{ fontSize: '0.88rem' }}>
            {secondaryLabel}
          </Link>
        ) : null
      )}
    </div>
  </div>
);
