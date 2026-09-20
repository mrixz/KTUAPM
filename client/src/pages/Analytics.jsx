import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { SchemeAnalyticsView } from '../components/analytics/SchemeAnalyticsView';
import { StatCard } from '../components/common/StatCard';
import { PieChart, Clock, Award, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';

export const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewData, catData, timeData, oppData, teleData] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getCategories(),
        analyticsService.getTimeline(),
        analyticsService.getOpportunities(),
        analyticsService.getTelemetry().catch(() => ({ metrics: null }))
      ]);

      setAnalytics({
        scheme: overviewData.scheme,
        entryType: overviewData.entryType,
        ruleVersion: overviewData.ruleVersion,
        overview: overviewData.overview,
        categoryStats: catData.categoryStats,
        timeline: timeData.timeline,
        opportunities: oppData.opportunities
      });

      if (teleData && teleData.metrics) {
        setTelemetry(teleData.metrics);
      }
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
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '2px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        Computing scheme analytics...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Activity Points Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Comprehensive breakdown of points, category caps, and time trends for KTU Scheme {analytics?.scheme}
          </p>
        </div>

        <Button variant="secondary" icon={RefreshCw} onClick={fetchAnalytics}>
          Refresh Analytics
        </Button>
      </div>

      {/* KPI Overview Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatCard
          title="Total Earned"
          value={`${analytics?.overview?.currentPoints || 0} pts`}
          subtitle={`Target: ${analytics?.overview?.requiredPoints || 100} pts`}
          icon={Award}
          color="emerald"
        />

        <StatCard
          title="Remaining Needed"
          value={`${analytics?.overview?.remainingPoints || 0} pts`}
          subtitle={`Max Allowed: ${analytics?.overview?.maximumPoints || 100} pts`}
          icon={Clock}
          color="amber"
        />

        <StatCard
          title="Completion Progress"
          value={`${analytics?.overview?.completionPercentage || 0}%`}
          subtitle="Official KTU requirement progress"
          icon={CheckCircle2}
          color="indigo"
        />

        <StatCard
          title="Verified Documents"
          value={analytics?.overview?.statusCounts?.counted || 0}
          subtitle={`Out of ${analytics?.overview?.statusCounts?.total || 0} submitted`}
          icon={PieChart}
          color="cyan"
        />
      </div>

      {/* Detailed Scheme Charts */}
      <SchemeAnalyticsView analytics={analytics} />

      {/* Engineering Telemetry Card */}
      {telemetry && telemetry.totalProcessed > 0 && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
            ⚡ Pipeline Performance & Latency Telemetry
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
            Real measured metrics across your certificate processing runs
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automation Rate</span>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                {telemetry.automationRate}%
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Median (P50) Latency</span>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>
                {telemetry.latencies?.median || 0} ms
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>95th Percentile (P95)</span>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                {telemetry.latencies?.p95 || 0} ms
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Rule Engine</span>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                {telemetry.stageBreakdown?.ruleEngine || 0} ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
