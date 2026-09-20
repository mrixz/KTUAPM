import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FileText, Eye, Trash2, RotateCw, ExternalLink, HelpCircle } from 'lucide-react';
import { CalculationTraceModal } from './CalculationTraceModal';
import { Link } from 'react-router-dom';

export const CertTable = ({ certificates = [], onDelete, onReprocess, loading = false }) => {
  const [selectedCert, setSelectedCert] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        Loading certificates...
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <FileText size={40} color="#64748b" style={{ marginBottom: '1rem' }} />
        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Certificates Uploaded Yet</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
          Upload your KTU activity certificates (NSS, Sports, Arts, Hackathons, Workshops) to have Gemini analyze and calculate points automatically.
        </p>
        <Link to="/upload">
          <Button icon={FileText}>Upload Your First Certificate</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.88rem'
          }}
        >
          <thead>
            <tr
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>Certificate / Activity</th>
              <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Confidence</th>
              <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Points</th>
              <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((cert) => (
              <tr
                key={cert._id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {cert.certificateTitle || cert.originalFilename}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {cert.eventName ? `${cert.eventName} • ` : ''}
                    {cert.level || 'College Level'}
                    {cert.achievement ? ` • ${cert.achievement}` : ''}
                  </div>
                </td>
                <td style={{ padding: '1rem 1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {cert.activityCategory || 'Unclassified'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1rem' }}>
                  <Badge status={cert.processingStatus} />
                </td>
                <td style={{ padding: '1rem 1rem' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color:
                        (cert.llmConfidence || 0) >= 0.8
                          ? '#34d399'
                          : (cert.llmConfidence || 0) >= 0.6
                          ? '#fbbf24'
                          : '#fb7185'
                    }}
                  >
                    {cert.llmConfidence ? `${Math.round(cert.llmConfidence * 100)}%` : '—'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1rem' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: cert.finalPoints > 0 ? '#34d399' : 'var(--text-muted)'
                    }}
                  >
                    {cert.finalPoints || 0} pts
                  </span>
                </td>
                <td style={{ padding: '1rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(cert.certificateDate || cert.uploadedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <button
                      onClick={() => setSelectedCert(cert)}
                      title="View Calculation Trace"
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: 'var(--accent-primary)',
                        padding: '0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex'
                      }}
                    >
                      <HelpCircle size={15} />
                    </button>
                    <Link
                      to={`/certificates/${cert._id}`}
                      title="Certificate Details & Document"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        padding: '0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex'
                      }}
                    >
                      <Eye size={15} />
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(cert._id)}
                        title="Delete Certificate"
                        style={{
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          color: '#fb7185',
                          padding: '0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CalculationTraceModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </>
  );
};
