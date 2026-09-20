import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { ProgressBar } from '../common/ProgressBar';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#f43f5e', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 20, 34, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          fontSize: '0.8rem'
        }}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{label}</p>
        <p style={{ color: '#fff', fontWeight: 700, margin: 0 }}>
          {payload[0].name}: <span style={{ color: payload[0].color || '#6366f1' }}>{payload[0].value} pts</span>
        </p>
      </div>
    );
  }
  return null;
};

export const SchemeAnalyticsView = ({ analytics }) => {
  if (!analytics) return null;

  const { scheme, entryType, overview, categoryStats = [], timeline = {} } = analytics;
  const { monthlyTrend = [], semesterTrend = [], cumulativeGrowth = [] } = timeline;

  // Radar data
  const radarData = categoryStats.map((c) => ({
    category: c.code || (c.name.length > 12 ? `${c.name.slice(0, 10)}...` : c.name),
    fullName: c.name,
    earned: c.earnedPoints,
    cap: c.categoryCap
  }));

  // Status pie data
  const statusPieData = [
    { name: 'Counted', value: overview?.statusCounts?.counted || 0, color: '#10b981' },
    { name: 'Needs Review', value: overview?.statusCounts?.needsReview || 0, color: '#f59e0b' },
    { name: 'Duplicates', value: overview?.statusCounts?.duplicate || 0, color: '#a855f7' },
    { name: 'Rejected/Failed', value: (overview?.statusCounts?.rejected || 0) + (overview?.statusCounts?.failed || 0), color: '#f43f5e' }
  ].filter((item) => item.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 2024 Group Minimums Section */}
      {scheme === '2024' && analytics.groupStats && (
        <div className="glass-card" style={{ border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>
            KTU 2024 Scheme Group Minimum Requirements
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
            Students must earn at least {entryType === 'lateral' ? 30 : 20} points from each Group ({entryType === 'lateral' ? '30' : '40'} pts per group mandated by KTU 2024 handbook).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
            {analytics.groupStats.map((grp) => (
              <div
                key={grp.groupId}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${grp.isMet ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{grp.groupName}</span>
                  <span style={{ fontSize: '1.1rem' }}>{grp.statusIndicator}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
                  <span className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: grp.isMet ? '#34d399' : '#fbbf24' }}>
                    {grp.earnedPoints} / {grp.minRequiredPoints} pts
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {grp.isMet ? 'Min Satisfied' : `${grp.shortfall} pts needed`}
                  </span>
                </div>
                <ProgressBar
                  value={grp.earnedPoints}
                  max={grp.minRequiredPoints}
                  color={grp.isMet ? '#10b981' : '#f59e0b'}
                  showPercentage={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Cap Utilization Grid */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>
          KTU Scheme {scheme} Category Cap Utilization
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
          Official rules limit points claimable per category ({entryType} entry).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
          {categoryStats.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.84rem', wordBreak: 'break-word' }}>{cat.name}</span>
                <span className="mono" style={{ fontSize: '0.76rem', color: cat.remainingCapacity === 0 ? '#f43f5e' : '#34d399', whiteSpace: 'nowrap' }}>
                  {cat.remainingCapacity === 0 ? 'Capped' : `${cat.remainingCapacity} pts left`}
                </span>
              </div>
              <ProgressBar
                value={cat.earnedPoints}
                max={cat.categoryCap}
                color={COLORS[idx % COLORS.length]}
                showPercentage={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Visual Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
        {/* Cumulative Points Growth Area Chart */}
        <div className="glass-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Cumulative Point Growth</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '1rem' }}>
            Progression toward required {overview?.requiredPoints || 100} points threshold
          </p>

          <div style={{ width: '100%', height: '220px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeGrowth.length > 0 ? cumulativeGrowth : [{ formattedDate: 'Start', cumulativePoints: 0 }]}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, overview?.requiredPoints || 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cumulativePoints" name="Cumulative Points" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Semester-Wise Progression Bar Chart */}
        <div className="glass-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Points by Semester</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '1rem' }}>
            Academic term activity points distribution (S1 - S8)
          </p>

          <div style={{ width: '100%', height: '220px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semesterTrend}>
                <XAxis dataKey="semester" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="points" name="Points Earned" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Radar & Status Distribution Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
        {/* Category Radar Chart */}
        <div className="glass-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Category Distribution Radar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '1rem' }}>
            Earned activity points vs category limits
          </p>

          <div style={{ width: '100%', height: '240px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="65%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={9.5} />
                <PolarRadiusAxis stroke="#64748b" fontSize={9} />
                <Radar name="Earned Points" dataKey="earned" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Radar name="Category Cap" dataKey="cap" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Certificate Status Distribution */}
        <div className="glass-card" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Document Status Health</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '1rem' }}>
            Processing pipeline accuracy breakdown
          </p>

          <div style={{ width: '100%', height: '240px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No certificates to display</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

