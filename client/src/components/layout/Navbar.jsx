import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, LogOut, Menu, X, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = ({ onToggleMenu, mobileMenuOpen }) => {
  const { user, profile, logout } = useAuth();

  return (
    <header
      style={{
        height: '68px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 20, 34, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%'
      }}
    >
      {/* Left: Mobile Hamburger & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMenu}
          className="mobile-only"
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0.55rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px'
          }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div
            style={{
              background: 'var(--gradient-primary)',
              padding: '0.45rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <Award size={19} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h2
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              KTU <span className="text-gradient">Activity Points</span>
            </h2>
            <span
              className="desktop-only"
              style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
            >
              AI-Assisted Certificate & Rule Platform
            </span>
          </div>
        </div>
      </div>

      {/* Right: Academic Info & Profile Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        {profile && (
          <div
            className="desktop-only"
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
              Scheme {profile.scheme}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {profile.entryType} ({profile.requiredPoints} pts)
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/profile"
            title="Academic Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              minHeight: '40px'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--gradient-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0
              }}
            >
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="desktop-only" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {profile?.registerNumber}
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            title="Log Out"
            aria-label="Log Out"
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#fb7185',
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              minHeight: '40px',
              transition: 'background 0.2s ease'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

