import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { SchemeAnalyticsView } from '../components/analytics/SchemeAnalyticsView';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { ProgressBar } from '../components/common/ProgressBar';
import { ProgressRing } from '../components/common/ProgressRing';
import { CheckCircle2, Clock, FileText, RefreshCw, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewData, catData, timeData] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getCategories(),
        analyticsService.getTimeline(),
      ]);

      setAnalytics({
        scheme: overviewData.scheme,
        entryType: overviewData.entryType,
        ruleVersion: overviewData.ruleVersion,
        overview: overviewData.overview,
        categoryStats: catData.categoryStats,
        timeline: timeData.timeline,
      });
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="meta-text">Loading your progress…</p>
      </div>
    );
  }

  const overview = analytics?.overview;
  const currentPoints = overview?.currentPoints || 0;
  const requiredPoints = overview?.requiredPoints || 100;
  const remainingPoints = overview?.remainingPoints || requiredPoints;
  const completionPct = overview?.completionPercentage || 0;
  const isComplete = remainingPoints === 0;
  const hasData = (overview?.statusCounts?.total || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <PageHeader
        title="Your Progress"
        subtitle={`KTU Scheme ${analytics?.scheme || ''} · ${analytics?.entryType || ''} entry`}
        actions={
          <button onClick={fetchAnalytics} className="btn btn-secondary btn-sm" aria-label="Refresh">
            <RefreshCw size={14} />
            <span className="desktop-only" style={{ display: 'inline' }}>Refresh</span>
          </button>
        }
      />

      {/* Progress Hero */}
      <div
        className="glass-card"
        style={{
          background: 'var(--gradient-hero)',
          borderColor: 'var(--accent-primary-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1.25rem, 4vw, 2.5rem)',
          flexWrap: 'wrap',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
        }}
      >
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <ProgressRing
            value={currentPoints}
            max={requiredPoints}
            size={140}
            strokeWidth={10}
            label={`${completionPct}%`}
            sublabel="complete"
            color={isComplete ? 'var(--color-success)' : 'var(--accent-primary)'}
          />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div className="eyebrow">Overall progress</div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.4rem' }}>
            {currentPoints} / {requiredPoints} pts
          </div>
          <p className="body-text">
            {isComplete
              ? 'You have met the graduation requirement. 🎉'
              : `You need ${remainingPoints} more points to meet the graduation requirement.`}
          </p>

          {!hasData && (
            <Link to="/upload" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '0.875rem' }}>
                <UploadCloud size={14} />
                Upload your first certificate
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
          gap: '0.875rem',
        }}
      >
        {[
          {
            icon: <CheckCircle2 size={16} />,
            color: 'var(--color-success-text)',
            bg: 'var(--color-success-bg)',
            border: 'var(--color-success-border)',
            label: 'Points earned',
            value: `${currentPoints} pts`,
          },
          {
            icon: <Clock size={16} />,
            color: 'var(--color-warning-text)',
            bg: 'var(--color-warning-bg)',
            border: 'var(--color-warning-border)',
            label: 'Still needed',
            value: isComplete ? 'Done!' : `${remainingPoints} pts`,
          },
          {
            icon: <CheckCircle2 size={16} />,
            color: 'var(--color-info-text)',
            bg: 'var(--color-info-bg)',
            border: 'var(--color-info-border)',
            label: 'Accepted',
            value: overview?.statusCounts?.counted || 0,
          },
          {
            icon: <FileText size={16} />,
            color: '#a5b4fc',
            bg: 'var(--accent-primary-subtle)',
            border: 'var(--accent-primary-border)',
            label: 'Total uploads',
            value: overview?.statusCounts?.total || 0,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card" style={{ padding: '0.875rem', borderColor: kpi.border }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: kpi.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
                marginBottom: '0.5rem',
              }}
            >
              {kpi.icon}
            </div>
            <div className="meta-text" style={{ marginBottom: '0.1rem' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts & category breakdown */}
      {hasData ? (
        <SchemeAnalyticsView analytics={analytics} />
      ) : (
        <EmptyState
          icon={<UploadCloud size={26} />}
          title="No data to show yet"
          body="Upload your first activity certificate and your progress charts will appear here."
          ctaLabel="Upload a Certificate"
          ctaTo="/upload"
          secondaryLabel="See what activities earn points"
          secondaryTo="/opportunities"
        />
      )}
    </div>
  );
};
