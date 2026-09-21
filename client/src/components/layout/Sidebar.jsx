import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  PieChart,
  Star,
  User,
  FlaskConical,
  Award,
  X,
  ChevronRight,
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose }) => {
  const primaryNav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/certificates', label: 'My Certificates', icon: FileText },
    { to: '/opportunities', label: 'Earn Points', icon: Star },
    { to: '/analytics', label: 'Progress', icon: PieChart },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const secondaryNav = [
    { to: '/evaluation', label: 'System Evaluation', icon: FlaskConical },
  ];

  return (
    <>
      <style>{`
        .app-sidebar {
          width: 252px;
          border-right: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          padding: 1.25rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          flex-shrink: 0;
          z-index: 50;
          overflow-y: auto;
        }

        @media (max-width: 1023px) {
          .app-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(82vw, 280px);
            z-index: 100;
            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.6);
            display: ${isOpen ? 'flex' : 'none'};
            animation: slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.7rem 0.875rem;
          min-height: 44px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          -webkit-tap-highlight-color: transparent;
        }
        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-surface);
        }
        .nav-link.active {
          font-weight: 600;
          color: #fff;
          background: var(--gradient-primary);
          box-shadow: var(--shadow-primary);
        }
        .nav-link-secondary {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 0.875rem;
          min-height: 40px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }
        .nav-link-secondary:hover {
          color: var(--text-secondary);
          background: var(--bg-surface);
        }
        .nav-link-secondary.active {
          color: var(--accent-primary);
          background: var(--accent-primary-subtle);
        }
      `}</style>

      <aside className="app-sidebar" aria-label="Main navigation">
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.25rem 1.1rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1rem',
            flexShrink: 0,
          }}
        >
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }} onClick={onClose}>
            <div
              style={{
                background: 'var(--gradient-primary)',
                padding: '0.4rem',
                borderRadius: '10px',
                display: 'flex',
                color: '#fff',
              }}
            >
              <Award size={17} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              KTU<span className="text-gradient">APM</span>
            </span>
          </Link>

          <button
            onClick={onClose}
            className="mobile-only"
            aria-label="Close navigation"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              minWidth: '36px',
              minHeight: '36px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Upload CTA */}
        <Link
          to="/upload"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1rem',
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: '1.1rem',
            boxShadow: 'var(--shadow-primary)',
            transition: 'box-shadow var(--transition-fast)',
            minHeight: '44px',
          }}
        >
          <UploadCloud size={16} />
          Upload Certificate
        </Link>

        {/* Primary Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Research & Evaluation divider */}
        <div style={{ marginTop: '1.5rem', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-disabled)',
              padding: '0 0.875rem 0.5rem',
            }}
          >
            Research & Evaluation
          </div>
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `nav-link-secondary${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
};
