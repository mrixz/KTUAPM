import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, User as UserIcon, LogOut, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, profile, logout } = useAuth();

  return (
    <header
      style={{
        height: '70px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 20, 34, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            background: 'var(--gradient-primary)',
            padding: '0.45rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            color: '#fff'
          }}
        >
          <Award size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
            KTU <span className="text-gradient">Activity Points</span>
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI-Assisted Certificate & Rule Platform
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {profile && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
              KTU Scheme {profile.scheme}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {profile.entryType} Entry ({profile.requiredPoints} pts)
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.04)'
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
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#fff'
              }}
            >
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {profile?.registerNumber}
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              color: '#fb7185',
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
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
