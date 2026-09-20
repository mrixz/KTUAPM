import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { FileText, Eye, Trash2, HelpCircle, Calendar, UploadCloud } from 'lucide-react';
import { CalculationTraceModal } from './CalculationTraceModal';
import { Link } from 'react-router-dom';
import { EmptyState } from '../common/EmptyState';

export const CertTable = ({ certificates = [], onDelete, onReprocess, loading = false }) => {
  const [selectedCert, setSelectedCert] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="meta-text">Loading certificates…</p>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={26} />}
        title="No certificates yet"
        body="Upload your activity certificates and we'll calculate the applicable KTU Activity Points for you."
        ctaLabel="Upload a Certificate"
        ctaTo="/upload"
        secondaryLabel="See activities that earn points"
        secondaryTo="/opportunities"
      />
    );
  }

  return (
    <>
      <style>{`
        .cert-table-desktop { display: block; }
        .cert-cards-mobile { display: none; }
        @media (max-width: 767px) {
          .cert-table-desktop { display: none; }
          .cert-cards-mobile { display: flex; flex-direction: column; gap: 0.875rem; }
        }
        .cert-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.45rem 0.65rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          transition: all var(--transition-fast);
          text-decoration: none;
          min-height: 34px;
          white-space: nowrap;
          font-family: var(--font-sans);
        }
      `}</style>

      {/* ── Mobile Card List (< 768px) ── */}
      <div className="cert-cards-mobile">
        {certificates.map((cert) => (
          <div
            key={cert._id}
            className="glass-card animate-slide-up"
            style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {/* Title + Points */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                  {cert.certificateTitle || cert.originalFilename}
                </h4>
                {cert.activityCategory && (
                  <div className="meta-text" style={{ marginTop: '0.2rem' }}>{cert.activityCategory}</div>
                )}
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: cert.finalPoints > 0 ? 'var(--color-success-text)' : 'var(--text-muted)',
                  background: cert.finalPoints > 0 ? 'var(--color-success-bg)' : 'var(--bg-surface)',
                  border: `1px solid ${cert.finalPoints > 0 ? 'var(--color-success-border)' : 'var(--border-subtle)'}`,
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {cert.finalPoints || 0} pts
              </div>
            </div>

            {/* Badges & Date */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
              <Badge status={cert.processingStatus} />
              <span className="meta-text" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={11} />
                {new Date(cert.certificateDate || cert.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => setSelectedCert(cert)}
                className="cert-action-btn"
                style={{
                  flex: 1,
                  background: 'var(--accent-primary-subtle)',
                  borderColor: 'var(--accent-primary-border)',
                  color: '#a5b4fc',
                }}
              >
                <HelpCircle size={14} />
                Why these points?
              </button>

              <Link
                to={`/certificates/${cert._id}`}
                className="cert-action-btn"
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Eye size={14} />
                View
              </Link>

              {onDelete && (
                <button
                  onClick={() => onDelete(cert._id)}
                  title="Delete certificate"
                  aria-label="Delete certificate"
                  className="cert-action-btn"
                  style={{
                    background: 'var(--color-danger-bg)',
                    borderColor: 'var(--color-danger-border)',
                    color: 'var(--color-danger-text)',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Table (≥ 768px) ── */}
      <div className="cert-table-desktop">
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}
          >
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>Certificate / Activity</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Points</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr
                  key={cert._id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem', wordBreak: 'break-word' }}>
                      {cert.certificateTitle || cert.originalFilename}
                    </div>
                    {cert.eventName && (
                      <div className="meta-text">{cert.eventName}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <span className="meta-text">{cert.activityCategory || '—'}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <Badge status={cert.processingStatus} />
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: cert.finalPoints > 0 ? 'var(--color-success-text)' : 'var(--text-muted)',
                      }}
                    >
                      {cert.finalPoints || 0} pts
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {new Date(cert.certificateDate || cert.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        onClick={() => setSelectedCert(cert)}
                        title="Why these points?"
                        aria-label="See why these points were awarded"
                        className="cert-action-btn"
                        style={{
                          background: 'var(--accent-primary-subtle)',
                          borderColor: 'var(--accent-primary-border)',
                          color: '#a5b4fc',
                        }}
                      >
                        <HelpCircle size={14} />
                        Why?
                      </button>
                      <Link
                        to={`/certificates/${cert._id}`}
                        title="View details"
                        className="cert-action-btn"
                        style={{
                          background: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Eye size={14} />
                        View
                      </Link>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(cert._id)}
                          title="Delete"
                          aria-label="Delete certificate"
                          className="cert-action-btn"
                          style={{
                            background: 'var(--color-danger-bg)',
                            borderColor: 'var(--color-danger-border)',
                            color: 'var(--color-danger-text)',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CalculationTraceModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </>
  );
};
