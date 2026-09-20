import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { certService } from '../services/certService';
import { CertTable } from '../components/certificates/CertTable';
import { ProgressBar } from '../components/common/ProgressBar';
import { ProgressRing } from '../components/common/ProgressRing';
import { CategoryProgressCard } from '../components/common/CategoryProgressCard';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  FileText,
  Star,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Map category names to emoji icons and human descriptions
const CATEGORY_META = {
  'National Initiatives': { icon: '🇮🇳', desc: 'NSS, NCC, and national service programmes' },
  'Sports & Games': { icon: '🏅', desc: 'Sports participation and prizes at any level' },
  'Cultural Activities': { icon: '🎭', desc: 'Arts, music, dance, theatre, and other cultural events' },
  'Professional Self Initiatives': { icon: '🎓', desc: 'MOOCs, workshops, internships, and technical events' },
  'Entrepreneurship & Innovation': { icon: '💡', desc: 'Patents, startups, and innovation projects' },
  'Leadership & Management': { icon: '🌟', desc: 'College union, club leadership, and committee roles' },
  // 2024 scheme groups
  'Group I': { icon: '🏆', desc: 'Sports, NSS, NCC, and co-curricular activities' },
  'Group II': { icon: '📚', desc: 'Professional and academic initiatives' },
  'Group III': { icon: '💼', desc: 'Internships, competitions, and entrepreneurship' },
};

const getCategoryMeta = (name) =>
  CATEGORY_META[name] || { icon: '📋', desc: 'Activity points in this category' };

export const Dashboard = () => {
  const { user, profile } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await authService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const analytics = dashboardData?.analytics;
  const overview = analytics?.overview;
  const recentCertificates = dashboardData?.recentCertificates || [];
  const categoryStats = analytics?.categoryStats || [];
  const opportunities = analytics?.opportunities;
  const suggestedActivities = opportunities?.suggestedActivities?.slice(0, 3) || [];

  const currentPoints = overview?.currentPoints || 0;
  const requiredPoints = overview?.requiredPoints || 100;
  const remainingPoints = overview?.remainingPoints || requiredPoints;
  const completionPct = overview?.completionPercentage || 0;
  const isComplete = remainingPoints === 0;

  const handleDeleteCertificate = async (id) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        await certService.deleteCertificate(id);
        fetchDashboard();
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ─── HERO PROGRESS SECTION ──────────────────────────── */}
      <div
        className="glass-card animate-fade-in"
        style={{
          background: 'var(--gradient-hero)',
          borderColor: 'var(--accent-primary-border)',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(1.25rem, 4vw, 2.5rem)',
            flexWrap: 'wrap',
          }}
        >
          {/* Progress ring */}
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <ProgressRing
              value={currentPoints}
              max={requiredPoints}
              size={152}
              strokeWidth={11}
              label={`${completionPct}%`}
              sublabel="complete"
              color={isComplete ? 'var(--color-success)' : 'var(--accent-primary)'}
            />
          </div>

          {/* Stats + actions */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div className="eyebrow">
              {isComplete ? '🎉 Goal achieved!' : 'Your progress'}
            </div>
            <h1
              style={{
                fontSize: 'clamp(1.4rem, 4.5vw, 1.9rem)',
                fontWeight: 800,
                marginBottom: '0.2rem',
                letterSpacing: '-0.03em',
              }}
            >
              Hello, {firstName}!
            </h1>
            <p className="body-text" style={{ marginBottom: '1rem' }}>
              {isComplete ? (
                <>You have met your KTU Activity Point requirement. 🎉</>
              ) : (
                <>
                  <strong style={{ color: 'var(--text-primary)' }}>{currentPoints} / {requiredPoints} points</strong>
                  {' '}earned. You need{' '}
                  <strong style={{ color: 'var(--color-warning-text)' }}>{remainingPoints} more points</strong>
                  {' '}to meet the graduation requirement.
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <Link to="/upload" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ gap: '0.45rem' }}>
                  <UploadCloud size={16} />
                  Upload Certificate
                </button>
              </Link>
              <Link to="/opportunities" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ gap: '0.45rem' }}>
                  <Star size={15} />
                  Earn Points
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI STRIP ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
          gap: '0.875rem',
        }}
      >
        {[
          {
            icon: <CheckCircle2 size={18} />,
            color: 'var(--color-success-text)',
            bg: 'var(--color-success-bg)',
            border: 'var(--color-success-border)',
            label: 'Points Earned',
            value: `${currentPoints} pts`,
            sub: `out of ${requiredPoints} required`,
          },
          {
            icon: <Clock size={18} />,
            color: 'var(--color-warning-text)',
            bg: 'var(--color-warning-bg)',
            border: 'var(--color-warning-border)',
            label: 'Points Remaining',
            value: isComplete ? 'Done!' : `${remainingPoints} pts`,
            sub: isComplete ? 'Requirement met' : 'still needed',
          },
          {
            icon: <FileText size={18} />,
            color: 'var(--color-info-text)',
            bg: 'var(--color-info-bg)',
            border: 'var(--color-info-border)',
            label: 'Certificates',
            value: overview?.statusCounts?.total || 0,
            sub: `${overview?.statusCounts?.counted || 0} verified`,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="glass-card"
            style={{ padding: '1rem', borderColor: kpi.border }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: kpi.bg,
                border: `1px solid ${kpi.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
                marginBottom: '0.65rem',
              }}
            >
              {kpi.icon}
            </div>
            <div className="meta-text" style={{ marginBottom: '0.15rem' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div className="meta-text" style={{ marginTop: '0.15rem' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── WHAT TO DO NEXT ──────────────────────────────────── */}
      {suggestedActivities.length > 0 && !isComplete && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="section-title">What should I do next?</h2>
              <p className="meta-text" style={{ marginTop: '0.2rem' }}>
                Activities that can help you earn more points under your scheme
              </p>
            </div>
            <Link to="/opportunities" className="link-accent" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              See all activities <ArrowUpRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '0.875rem',
            }}
          >
            {suggestedActivities.map((activity, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activity.categoryName}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {activity.activityName}
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-success-text)',
                    gap: '0.25rem',
                    width: 'fit-content',
                  }}
                >
                  Up to {activity.potentialPoints} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CATEGORY PROGRESS ────────────────────────────────── */}
      {categoryStats.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="section-title">Points by category</h2>
            <Link to="/analytics" className="link-accent" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View progress <ArrowUpRight size={14} />
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '0.875rem',
            }}
          >
            {categoryStats.map((cat) => {
              const meta = getCategoryMeta(cat.name);
              return (
                <CategoryProgressCard
                  key={cat.id}
                  icon={meta.icon}
                  name={cat.name}
                  description={meta.desc}
                  earnedPoints={cat.earnedPoints}
                  categoryCap={cat.categoryCap}
                  remainingCapacity={cat.remainingCapacity}
                  to="/opportunities"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── RECENT CERTIFICATES ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title">Recent certificates</h2>
          <Link
            to="/certificates"
            className="link-accent"
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            View all ({overview?.statusCounts?.total || 0}) <ArrowUpRight size={14} />
          </Link>
        </div>

        <CertTable
          certificates={recentCertificates}
          onDelete={handleDeleteCertificate}
          loading={loading}
        />
      </div>
    </div>
  );
};
