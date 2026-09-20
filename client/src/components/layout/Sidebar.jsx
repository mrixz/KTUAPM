import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  PieChart,
  Compass,
  User,
  FlaskConical,
  Award,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/certificates', label: 'Certificates', icon: FileText },
    { to: '/upload', label: 'Upload & Process', icon: UploadCloud },
    { to: '/analytics', label: 'Analytics', icon: PieChart },
    { to: '/opportunities', label: 'Get More Points', icon: Compass },
    { to: '/evaluation', label: 'Benchmark Lab', icon: FlaskConical },
    { to: '/profile', label: 'Academic Profile', icon: User }
  ];

  return (
    <>
      <style>{`
        .app-sidebar {
          width: 260px;
          border-right: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          flex-shrink: 0;
          z-index: 50;
        }

        @media (max-width: 1023px) {
          .app-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(85vw, 300px);
            z-index: 100;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
            display: ${isOpen ? 'flex' : 'none'};
            animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            overflow-y: auto;
          }
        }
      `}</style>

      <aside className="app-sidebar">
        <div>
          {/* Mobile Drawer Header with Close Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 0.5rem 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  background: 'var(--gradient-primary)',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  color: '#fff'
                }}
              >
                <Award size={18} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                KTU <span className="text-gradient">APM</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="mobile-only"
              aria-label="Close Navigation Drawer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.45rem',
                minWidth: '36px',
                minHeight: '36px',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              padding: '0 0.75rem 0.75rem',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Main Navigation
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.95rem',
                    minHeight: '44px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: '0.92rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    background: isActive ? 'var(--gradient-primary)' : 'transparent',
                    boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
                    transition: 'all var(--transition-fast)'
                  })}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div
          className="glass-card"
          style={{
            marginTop: '1.5rem',
            padding: '0.9rem',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem', color: 'var(--accent-cyan)' }}>
            <Award size={22} />
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            KTU Official Rule Engine
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Deterministic Point Calculation
          </div>
        </div>
      </aside>
    </>
  );
};

