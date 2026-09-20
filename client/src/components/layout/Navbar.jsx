import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, LogOut, Menu, X, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = ({ onToggleMenu, mobileMenuOpen }) => {
  const { user, profile, logout } = useAuth();

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 13, 20, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        gap: '0.75rem',
      }}
    >
      {/* Left: Mobile Hamburger + Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        <button
          onClick={onToggleMenu}
          className="mobile-only"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px',
            flexShrink: 0,
          }}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none', minWidth: 0 }}>
          <div
            style={{
              background: 'var(--gradient-primary)',
              padding: '0.38rem',
              borderRadius: '9px',
              display: 'flex',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Award size={17} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
              }}
            >
              KTU<span className="text-gradient">APM</span>
            </span>
            <span
              className="desktop-only"
              style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '-1px' }}
            >
              Activity Points Manager
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Scheme indicator + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {profile && (
          <div
            className="desktop-only"
            style={{
              background: 'var(--accent-primary-subtle)',
              border: '1px solid var(--accent-primary-border)',
              padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ color: '#a5b4fc', fontWeight: 700 }}>
              Scheme {profile.scheme}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {profile.entryType} · {profile.requiredPoints} pts required
            </span>
          </div>
        )}

        <Link
          to="/profile"
          aria-label="My profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            textDecoration: 'none',
            padding: '0.3rem 0.55rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            minHeight: '38px',
            transition: 'all var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--gradient-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <span
            className="desktop-only"
            style={{ fontSize: '0.84rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}
          >
            {user?.name}
          </span>
        </Link>

        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            padding: '0.45rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '38px',
            minHeight: '38px',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-danger-text)';
            e.currentTarget.style.borderColor = 'var(--color-danger-border)';
            e.currentTarget.style.background = 'var(--color-danger-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
};
