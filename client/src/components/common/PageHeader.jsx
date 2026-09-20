import React from 'react';

/**
 * PageHeader — consistent page-level heading component
 * Props: title, subtitle, badge (node), actions (node), eyebrow (string), centered (bool)
 */
export const PageHeader = ({ title, subtitle, badge, actions, eyebrow, centered = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: centered ? 'center' : 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '1rem',
      textAlign: centered ? 'center' : 'left',
    }}
  >
    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
      {eyebrow && (
        <div className="eyebrow" style={{ justifyContent: centered ? 'center' : 'flex-start' }}>
          {eyebrow}
        </div>
      )}
      <h1 className="page-title" style={{ marginBottom: subtitle ? '0.3rem' : 0, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: centered ? 'center' : 'flex-start' }}>
        {title}
        {badge && badge}
      </h1>
      {subtitle && (
        <p className="body-text" style={{ maxWidth: '520px', margin: centered ? '0 auto' : 0 }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        {actions}
      </div>
    )}
  </div>
);
