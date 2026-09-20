import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { certService } from '../services/certService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  FileText,
  ArrowLeft,
  RotateCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Scale,
  Download
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const CertificateDetail = () => {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const { error, success } = useNotification();
  const navigate = useNavigate();

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const data = await certService.getCertificateById(id);
      setCertificate(data.certificate);
    } catch (err) {
      error('Failed to load certificate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  const handleReprocess = async () => {
    try {
      setReprocessing(true);
      const data = await certService.reprocessCertificate(id);
      setCertificate(data.certificate);
      success('Certificate re-evaluated through pipeline.');
    } catch (err) {
      error('Failed to reprocess certificate.');
    } finally {
      setReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this certificate permanently?')) {
      try {
        await certService.deleteCertificate(id);
        success('Certificate deleted.');
        navigate('/certificates');
      } catch (err) {
        error('Failed to delete.');
      }
    }
  };

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
        Loading certificate record...
      </div>
    );
  }

  if (!certificate) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h3>Certificate Not Found</h3>
        <Link to="/certificates">
          <Button variant="secondary" icon={ArrowLeft} style={{ marginTop: '1rem' }}>
            Back to Certificates
          </Button>
        </Link>
      </div>
    );
  }

  const trace = certificate.calculationTrace || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/certificates">
            <button
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: '1.6rem', margin: 0 }}>
              {certificate.certificateTitle || certificate.originalFilename}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              Uploaded: {new Date(certificate.uploadedAt).toLocaleString()} • Storage Key:{' '}
              <span className="mono">{certificate.storageKey}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Button
            variant="secondary"
            icon={RotateCw}
            loading={reprocessing}
            onClick={handleReprocess}
          >
            Re-Evaluate
          </Button>
          <Button variant="danger" icon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Overview Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Final KTU Points
          </span>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '0.3rem 0' }}>
            {certificate.finalPoints} Pts
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Base: {certificate.basePoints} pts • Cap Adj: {certificate.categoryAdjustment} pts
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Processing Status
          </span>
          <div style={{ margin: '0.6rem 0' }}>
            <Badge status={certificate.processingStatus} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {certificate.statusReason || 'Verified under rules'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            AI Confidence
          </span>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', margin: '0.3rem 0' }}>
            {Math.round((certificate.llmConfidence || 0) * 100)}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Model: {certificate.llmModel || 'Gemini 2.5 Flash'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Matched Rule ID
          </span>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: '0.5rem 0' }}>
            {certificate.matchedRuleId || 'NO_RULE'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Scheme {certificate.scheme} ({certificate.ruleVersion})
          </span>
        </div>
      </div>

      {/* Main Content: Extracted Facts & Document Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.75rem' }}>
        {/* Extracted Information Table */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Cpu size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>AI-Extracted Structured Facts</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            {[
              { label: 'Activity Category', value: certificate.activityCategory },
              { label: 'Subcategory', value: certificate.subcategory },
              { label: 'Event Name', value: certificate.eventName },
              { label: 'Organizer', value: certificate.organizer },
              { label: 'Level', value: certificate.level },
              { label: 'Achievement / Award', value: certificate.achievement },
              { label: 'Position', value: certificate.position },
              { label: 'Duration / Dates', value: certificate.duration },
              { label: 'Certificate Date', value: certificate.certificateDate ? new Date(certificate.certificateDate).toLocaleDateString() : null },
              { label: 'Participant Name', value: certificate.participantName },
              { label: 'Certificate Number', value: certificate.certificateNumber },
              { label: 'SHA-256 Hash', value: certificate.fileHash ? `${certificate.fileHash.slice(0, 16)}...` : null }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}:</span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>
                  {item.value || 'N/A'}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Document Preview & File Info */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Stored Document</h3>
            </div>
            <a
              href={certService.getFileUrl(certificate._id)}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button size="sm" variant="secondary" icon={Download}>
                View / Download
              </Button>
            </a>
          </div>

          <div
            style={{
              flex: 1,
              background: 'rgba(10, 13, 20, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              minHeight: '280px'
            }}
          >
            {certificate.mimeType === 'application/pdf' ? (
              <iframe
                src={certService.getFileUrl(certificate._id)}
                title="Certificate PDF Preview"
                style={{ width: '100%', height: '350px', border: 'none', borderRadius: 'var(--radius-sm)' }}
              />
            ) : certificate.mimeType.startsWith('image/') ? (
              <img
                src={certService.getFileUrl(certificate._id)}
                alt="Certificate Document"
                style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              />
            ) : (
              <div>
                <FileText size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: 600 }}>{certificate.originalFilename}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {certificate.mimeType} • {(certificate.fileSizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step-by-Step Calculation Trace */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <Scale size={22} color="var(--accent-primary)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Explainable Calculation Trace</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              Deterministic derivation under official KTU Scheme {certificate.scheme} ({certificate.ruleVersion})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {trace.map((stepItem, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {stepItem.step || idx + 1}
                </div>
                <h4 style={{ fontSize: '0.98rem', margin: 0 }}>{stepItem.name}</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', paddingLeft: '2rem', marginBottom: '0.75rem' }}>
                {stepItem.description}
              </p>

              {stepItem.data && (
                <div
                  style={{
                    marginLeft: '2rem',
                    background: 'rgba(10, 13, 20, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.5rem',
                    fontSize: '0.8rem'
                  }}
                >
                  {Object.entries(stepItem.data).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                      <strong>{String(v ?? 'N/A')}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
