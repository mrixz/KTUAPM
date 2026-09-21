import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  icon: Icon,
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.7s linear infinite'
            }}
            aria-hidden="true"
          />
          <span className="sr-only">Loading…</span>
        </>
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 17} aria-hidden="true" />
      )}
      <span>{children}</span>
    </button>
  );
};
