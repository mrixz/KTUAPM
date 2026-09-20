import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { rulesService } from '../services/rulesService';
import { PageHeader } from '../components/common/PageHeader';
import { CategoryProgressCard } from '../components/common/CategoryProgressCard';
import { EmptyState } from '../components/common/EmptyState';
import { ProgressBar } from '../components/common/ProgressBar';
import {
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

// Map category names to emoji icons and plain-English descriptions
const CATEGORY_META = {
  'National Initiatives': {
    icon: '🇮🇳',
    desc: 'NSS volunteering, NCC training, and participation in national service programmes earn points here.',
  },
  'Sports & Games': {
    icon: '🏅',
    desc: 'Represent your college or state in sports competitions. Points depend on the event level and your achievement.',
  },
  'Cultural Activities': {
    icon: '🎭',
    desc: 'Arts, music, dance, drama, and other cultural events count here. Inter-collegiate and state-level events earn more.',
  },
  'Professional Self Initiatives': {
    icon: '🎓',
    desc: 'MOOCs with assessments, internships, workshops, hackathons, technical fests, paper presentations, and professional society activities.',
  },
  'Entrepreneurship & Innovation': {
    icon: '💡',
    desc: 'Patents, startups, or innovation projects recognized at any level earn points under this category.',
  },
  'Leadership & Management': {
    icon: '🌟',
    desc: 'Elected positions in the college union, departmental clubs, or management of accredited college events.',
  },
  'Group I': { icon: '🏆', desc: 'Sports, NSS, NCC, and co-curricular activities.' },
  'Group II': { icon: '📚', desc: 'Professional certifications, language proficiency, and academic initiatives.' },
  'Group III': { icon: '💼', desc: 'Internships, research, entrepreneurship, and competitions.' },
};

// Human-readable level names (instead of Level I, II, III, IV, V)
const LEVEL_LABELS = {
  'Level I': 'College level',
  'Level II': 'Zonal level',
  'Level III': 'State / University level',
  'Level IV': 'National level',
  'Level V': 'International level',
  'Level 1': 'College level',
  'Level 2': 'Zonal level',
  'Level 3': 'State / University level',
  'Level 4': 'National level',
  'Level 5': 'International level',
};

const humanLevel = (level) => {
  if (!level) return null;
  return LEVEL_LABELS[level] || level;
};

const getCategoryMeta = (name) =>
  CATEGORY_META[name] || { icon: '📋', desc: 'Activity points in this category.' };

export const Opportunities = () => {
  const [opportunities, setOpportunities] = useState(null);
  const [currentRules, setCurrentRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [oppData, rulesData] = await Promise.all([
          analyticsService.getOpportunities(),
          rulesService.getCurrentRules().catch(() => ({ ruleSet: null })),
        ]);
        setOpportunities(oppData.opportunities);
        setCurrentRules(rulesData.ruleSet);
      } catch (err) {
        console.error('Earn Points load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="meta-text">Loading activities…</p>
      </div>
    );
  }

  const allRules = currentRules?.rules || [];
  const categoryOpportunities = opportunities?.categoryOpportunities || [];

  // Group rules by category
  const rulesByCategory = {};
  allRules.forEach((rule) => {
    const cat = rule.categoryName || rule.categoryId?.replace(/_/g, ' ') || 'Other';
    if (!rulesByCategory[cat]) rulesByCategory[cat] = [];
    rulesByCategory[cat].push(rule);
  });

  // Filter rules by search
  const filteredRules = (catRules) => {
    if (!searchQuery.trim()) return catRules;
    const q = searchQuery.toLowerCase();
    return catRules.filter(
      (r) =>
        r.activityName?.toLowerCase().includes(q) ||
        r.subcategory?.toLowerCase().includes(q) ||
        r.evidenceRequirements?.some((e) => e.toLowerCase().includes(q))
    );
  };

  const categoryNames = Object.keys(rulesByCategory);
  const allFiltered = categoryNames.filter((cat) => filteredRules(rulesByCategory[cat]).length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <PageHeader
        title="Earn Points"
        subtitle="Choose an activity below to see how many points it can earn under your KTU scheme."
        eyebrow="How can I earn Activity Points?"
      />

      {/* Category progress overview */}
      {categoryOpportunities.length > 0 && (
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.875rem' }}>
            Your category progress
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
              gap: '0.875rem',
            }}
          >
            {categoryOpportunities.map((cat) => {
              const meta = getCategoryMeta(cat.categoryName);
              return (
                <CategoryProgressCard
                  key={cat.categoryId}
                  icon={meta.icon}
                  name={cat.categoryName}
                  description={meta.desc}
                  earnedPoints={cat.earnedPoints}
                  categoryCap={cat.categoryCap}
                  remainingCapacity={cat.remainingCapacity}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Explorer */}
      {allRules.length > 0 && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className="section-title">Activity guide</h2>
              <p className="meta-text" style={{ marginTop: '0.2rem' }}>
                All qualifying activities under your KTU scheme
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search activities — MOOC, NSS, internship, hackathon, sports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>

          {/* Category accordions */}
          {allFiltered.length === 0 ? (
            <EmptyState
              title="No activities match your search"
              body="Try searching for 'sports', 'MOOC', 'NSS', or 'internship'."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allFiltered.map((catName) => {
                const meta = getCategoryMeta(catName);
                const catRules = filteredRules(rulesByCategory[catName]);
                const catOpp = categoryOpportunities.find((c) => c.categoryName === catName);
                const isOpen = openCategory === catName;

                return (
                  <div
                    key={catName}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    {/* Category header — accordion toggle */}
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : catName)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.875rem',
                        padding: '0.875rem 1rem',
                        background: isOpen ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background var(--transition-fast)',
                        minHeight: '56px',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                          {catName}
                        </div>
                        {!isOpen && (
                          <div className="meta-text" style={{ marginTop: '0.15rem', lineHeight: 1.3 }}>
                            {catRules.length} activities
                            {catOpp && catOpp.earnedPoints > 0 ? ` · ${catOpp.earnedPoints} pts earned` : ''}
                          </div>
                        )}
                      </div>

                      {catOpp && (
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.78rem', color: catOpp.remainingCapacity === 0 ? 'var(--color-success-text)' : 'var(--text-muted)' }}>
                            {catOpp.remainingCapacity === 0 ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={13} /> Full
                              </span>
                            ) : (
                              `${catOpp.earnedPoints} / ${catOpp.categoryCap} pts`
                            )}
                          </div>
                        </div>
                      )}

                      {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </button>

                    {/* Category description + activities */}
                    {isOpen && (
                      <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        {/* Description */}
                        <p className="body-text" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
                          {meta.desc}
                        </p>

                        {/* Progress bar if data available */}
                        {catOpp && (
                          <div style={{ marginBottom: '1.1rem' }}>
                            <ProgressBar
                              value={catOpp.earnedPoints}
                              max={catOpp.categoryCap}
                              height="6px"
                              showPercentage={false}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {catOpp.earnedPoints} pts earned
                              </span>
                              <span style={{ color: catOpp.remainingCapacity === 0 ? 'var(--color-success-text)' : 'var(--text-muted)' }}>
                                {catOpp.remainingCapacity === 0
                                  ? 'Maximum reached'
                                  : `You can still earn up to ${catOpp.remainingCapacity} pts here`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Activity list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {catRules.map((rule) => (
                            <div
                              key={rule.ruleId}
                              style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.875rem 1rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', wordBreak: 'break-word', lineHeight: 1.3 }}>
                                    {rule.activityName}
                                  </div>
                                  {rule.subcategory && rule.subcategory !== rule.activityName && (
                                    <div className="meta-text" style={{ marginBottom: '0.35rem' }}>
                                      {rule.subcategory}
                                    </div>
                                  )}
                                  {rule.evidenceRequirements?.length > 0 && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                      <span style={{ fontWeight: 600 }}>What you need: </span>
                                      {rule.evidenceRequirements[0]}
                                    </div>
                                  )}
                                </div>
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                  <div
                                    style={{
                                      background: 'var(--color-success-bg)',
                                      border: '1px solid var(--color-success-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.2rem 0.55rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      color: 'var(--color-success-text)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Up to {rule.maxPointsPerActivity} pts
                                  </div>
                                </div>
                              </div>

                              {/* Level info in human-readable form */}
                              {rule.levelRequired && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Level: {humanLevel(rule.levelRequired) || rule.levelRequired}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && allRules.length === 0 && (
        <EmptyState
          title="Activity guide not available"
          body="We couldn't load the activity list. Please try refreshing the page."
        />
      )}
    </div>
  );
};
