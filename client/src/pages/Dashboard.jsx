import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { certService } from '../services/certService';
import { StatCard } from '../components/common/StatCard';
import { CertTable } from '../components/certificates/CertTable';
import { ProgressBar } from '../components/common/ProgressBar';
import { OpportunitiesWidget } from '../components/analytics/OpportunitiesWidget';
import { Button } from '../components/common/Button';
import {
  Award,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Compass,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { profile } = useAuth();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          padding: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            <Sparkles size={14} /> KTU Activity Points Engine
          </div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>
            Welcome back, {dashboardData?.profile?.registerNumber || 'Student'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '550px' }}>
            KTU Scheme {profile?.scheme} ({profile?.ruleVersion}) • {profile?.entryType?.toUpperCase()} Entry • {profile?.branch}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/upload">
            <Button size="lg" icon={UploadCloud}>
              Upload Certificate
            </Button>
          </Link>
          <Link to="/opportunities">
            <Button variant="secondary" size="lg" icon={Compass}>
              Points Advisor
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatCard
          title="Current Points"
          value={`${overview?.currentPoints || 0} pts`}
          subtitle={`Out of ${overview?.requiredPoints || 100} required`}
          icon={Award}
          color="emerald"
        />

        <StatCard
          title="Remaining Needed"
          value={`${overview?.remainingPoints || 0} pts`}
          subtitle={overview?.remainingPoints === 0 ? 'Goal Completed!' : 'To satisfy KTU requirement'}
          icon={Clock}
          color="amber"
        />

        <StatCard
          title="Completion Rate"
          value={`${overview?.completionPercentage || 0}%`}
          subtitle={`${overview?.currentPoints || 0} / ${overview?.requiredPoints || 100} points awarded`}
          icon={CheckCircle2}
          color="indigo"
        />

        <StatCard
          title="Total Documents"
          value={overview?.statusCounts?.total || 0}
          subtitle={`${overview?.statusCounts?.counted || 0} Counted • ${overview?.statusCounts?.needsReview || 0} Review`}
          icon={FileText}
          color="cyan"
        />
      </div>

      {/* Overall Progress Gauge Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Official KTU Progress</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              Deterministic point accumulation under Scheme {profile?.scheme}
            </p>
          </div>
          <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {overview?.completionPercentage || 0}%
          </span>
        </div>
        <ProgressBar
          value={overview?.currentPoints || 0}
          max={overview?.requiredPoints || 100}
          height="12px"
          showPercentage={false}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>0 Points</span>
          <span>Target: {overview?.requiredPoints || 100} Points (Maximum Cap: {overview?.maximumPoints || 100})</span>
        </div>
      </div>

      {/* Opportunities / "How Can I Get More Points" Advisor Widget */}
      {analytics?.opportunities && (
        <OpportunitiesWidget opportunities={analytics.opportunities} />
      )}

      {/* Recent Certificates Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Recent Certificates</h3>
          <Link
            to="/certificates"
            style={{ color: 'var(--accent-primary)', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            View All ({overview?.statusCounts?.total || 0}) <ArrowUpRight size={16} />
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
