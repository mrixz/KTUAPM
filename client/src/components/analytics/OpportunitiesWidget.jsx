import React from 'react';
import { Compass, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';

export const OpportunitiesWidget = ({ opportunities }) => {
  if (!opportunities) return null;

  const {
    currentPoints = 0,
    requiredPoints = 100,
    remainingPoints = 0,
    categoryOpportunities = [],
    suggestedActivities = []
  } = opportunities;

  const openCategories = categoryOpportunities.filter((c) => c.hasCapacity);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-cyan)',
              display: 'flex'
            }}
          >
            <Compass size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>How Can I Get More Points?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              Deterministic capacity analysis based on your active KTU scheme regulations
            </p>
          </div>
        </div>

        <div className="mono" style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Target Deficit</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: remainingPoints > 0 ? '#fbbf24' : '#34d399' }}>
            {remainingPoints > 0 ? `${remainingPoints} Pts Needed` : 'Target Achieved! 🎉'}
          </div>
        </div>
      </div>

      {remainingPoints === 0 ? (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            textAlign: 'center'
          }}
        >
          <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '0.5rem' }} />
          <h4 style={{ color: '#34d399', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
            Congratulations! You have satisfied all {requiredPoints} required KTU activity points!
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            You meet the official graduation requirements for KTU activity credits.
          </p>
        </div>
      ) : (
        <>
          {/* Category Capacity Cards */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Categories With Available Point Headroom
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {openCategories.map((cat) => (
                <div
                  key={cat.categoryId}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1.1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{cat.categoryName}</span>
                    <span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: 700 }}>
                      +{cat.remainingCapacity} pts max
                    </span>
                  </div>
                  <ProgressBar
                    value={cat.earnedPoints}
                    max={cat.categoryCap}
                    color="var(--gradient-cyan)"
                    height="6px"
                    showPercentage={false}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Subcategories: {cat.subcategories.slice(0, 3).join(', ')}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Qualifying Activities from Official Rule Set */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Qualifying Activity Suggestions (From Official Scheme Rules)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
              {suggestedActivities.slice(0, 6).map((activity, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(10, 13, 20, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {activity.categoryName} • {activity.subcategory}
                      </span>
                      <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>
                        Up to {activity.potentialPoints} Pts
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {activity.activityName}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Ref: {activity.officialReference}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
