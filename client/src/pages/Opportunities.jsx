import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { OpportunitiesWidget } from '../components/analytics/OpportunitiesWidget';
import { rulesService } from '../services/rulesService';
import { Compass, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Opportunities = () => {
  const [opportunities, setOpportunities] = useState(null);
  const [currentRules, setCurrentRules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [oppData, rulesData] = await Promise.all([
          analyticsService.getOpportunities(),
          rulesService.getCurrentRules().catch(() => ({ ruleSet: null }))
        ]);
        setOpportunities(oppData.opportunities);
        setCurrentRules(rulesData.ruleSet);
      } catch (err) {
        console.error('Opportunities load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
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
        Analyzing remaining point headroom from official regulations...
      </div>
    );
  }

  const allRules = currentRules?.rules || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Points Opportunity Advisor</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Discover official KTU activities and categories with remaining point capacity
        </p>
      </div>

      <OpportunitiesWidget opportunities={opportunities} />

      {/* Official Rule Catalog for Student's Scheme */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <BookOpen size={20} color="var(--accent-primary)" />
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
              Full Activity Catalog for {currentRules?.title || 'Active Scheme'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>
              All qualifying activities and max points permitted under {currentRules?.scheme} regulations
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {allRules.map((rule) => (
            <div
              key={rule.ruleId}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    {rule.ruleId}
                  </span>
                  <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>
                    Max {rule.maxPointsPerActivity} Pts
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0.5rem', color: 'var(--text-primary)' }}>
                  {rule.activityName}
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  Category: {rule.categoryId.replace(/_/g, ' ')} • Subcategory: {rule.subcategory}
                </div>
              </div>

              {rule.evidenceRequirements && rule.evidenceRequirements.length > 0 && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  Evidence: {rule.evidenceRequirements[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
