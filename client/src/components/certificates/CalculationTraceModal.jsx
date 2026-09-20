import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { CheckCircle2, ShieldCheck, Sparkles, Scale, Info, ArrowRight } from 'lucide-react';

export const CalculationTraceModal = ({ isOpen, onClose, certificate }) => {
  if (!certificate) return null;

  const trace = certificate.calculationTrace || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explainable Calculation Trace"
      subtitle={`Certificate: ${certificate.certificateTitle || certificate.originalFilename}`}
      maxWidth="800px"
    >
      {/* Summary Header */}
      <div
        style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Final Awarded
          </span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
            {certificate.finalPoints} Pts
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Status
          </span>
          <div style={{ marginTop: '0.2rem' }}>
            <Badge status={certificate.processingStatus} />
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Rule Applied
          </span>
          <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            {certificate.matchedRuleId || 'None'}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            AI Confidence
          </span>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>
            {Math.round((certificate.llmConfidence || 0) * 100)}%
          </div>
        </div>
      </div>

      {/* Step by Step Trace Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Deterministic Calculation Steps
        </h4>

        {trace.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No structured calculation trace recorded for this document.
          </div>
        ) : (
          trace.map((stepItem, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff'
                  }}
                >
                  {stepItem.step || idx + 1}
                </div>
                <h5 style={{ fontSize: '0.98rem', margin: 0, color: 'var(--text-primary)' }}>
                  {stepItem.name}
                </h5>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '0.75rem', paddingLeft: '2rem' }}>
                {stepItem.description}
              </p>

              {stepItem.data && (
                <div
                  style={{
                    marginLeft: '2rem',
                    background: 'rgba(10, 13, 20, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.5rem',
                    fontSize: '0.8rem'
                  }}
                >
                  {Object.entries(stepItem.data).map(([key, val]) => (
                    <div key={key}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}:{' '}
                      </span>
                      <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                        {String(val ?? 'N/A')}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
