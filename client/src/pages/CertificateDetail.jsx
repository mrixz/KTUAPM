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
  Scale,
  Download,
  Info,
  CheckCircle2,
  AlertCircle
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
      success('Certificate re-checked successfully.');
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
        <Link to="/certificates" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" icon={ArrowLeft} style={{ marginTop: '1rem' }}>
            Back to Certificates
          </Button>
        </Link>
      </div>
    );
  }

  const trace = certificate.calculationTrace || [];
  const basePoints = certificate.basePoints !== undefined ? certificate.basePoints : certificate.finalPoints;
  const finalPoints = certificate.finalPoints || 0;
  const hasAdjustment = (basePoints > 0 && finalPoints < basePoints) || 
    (certificate.statusReason && (certificate.statusReason.includes('maximum') || certificate.statusReason.includes('cap') || certificate.statusReason.includes('already') || certificate.statusReason.includes('reached')));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: '1 1 260px' }}>
          <Link to="/certificates">
            <button
              aria-label="Back to Certificates"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '40px'
              }}
            >
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.6rem)', margin: 0, wordBreak: 'break-word', lineHeight: 1.25 }}>
              {certificate.certificateTitle || certificate.originalFilename}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0', wordBreak: 'break-word' }}>
              Uploaded on {new Date(certificate.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={RotateCw}
            loading={reprocessing}
            onClick={handleReprocess}
          >
            Re-check certificate
          </Button>
          <Button variant="danger" icon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Top Overview Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Points Awarded
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: finalPoints > 0 ? 'var(--color-success-text)' : 'var(--text-secondary)', margin: '0.2rem 0', fontFamily: 'var(--font-mono)' }}>
            {finalPoints} pts
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
            KTU Scheme {certificate.scheme}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Status
          </span>
          <div style={{ margin: '0.5rem 0' }}>
            <Badge status={certificate.processingStatus} />
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
            {certificate.statusReason || 'Verified under official KTU rules'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Activity Category
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.4rem 0', lineHeight: 1.3 }}>
            {certificate.activityCategory || 'Unclassified'}
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
            {certificate.subcategory || 'General'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Achievement
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)', margin: '0.4rem 0' }}>
            {certificate.achievement || 'Participation'}
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
            {certificate.level || 'Standard'}
          </span>
        </div>
      </div>

      {/* Redesigned "Why did I get these points?" Card */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Scale size={22} color="var(--accent-primary)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Why did I get these points?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>
              Explanation of how your points were determined under official KTU regulations
            </p>
          </div>
        </div>

        {/* 3 Structured Fact Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.9rem', marginBottom: '1.2rem' }}>
          {/* Box 1: What We Found */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.95rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              What we found
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', wordBreak: 'break-word' }}>
              {certificate.eventName || certificate.certificateTitle || certificate.subcategory || 'Activity Certificate'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {certificate.duration && <span>Duration: {certificate.duration}</span>}
              {certificate.achievement && <span>Achievement: {certificate.achievement}</span>}
              {certificate.organizer && <span>Issued by: {certificate.organizer}</span>}
            </div>
          </div>

          {/* Box 2: KTU Rule */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.95rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Applicable KTU Rule
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', wordBreak: 'break-word' }}>
              {certificate.subcategory || certificate.activityCategory || 'Activity Rule'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              KTU Scheme {certificate.scheme} Regulations
            </div>
          </div>

          {/* Box 3: Points for this activity */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.95rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Points for this activity
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              {basePoints} points
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Standard points for qualifying activity
            </div>
          </div>
        </div>

        {/* Adjustment Section (Shown ONLY if adjustment actually occurred) */}
        {hasAdjustment && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem',
              marginBottom: '1.2rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            <Info size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adjustment
              </span>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {certificate.statusReason}
              </p>
            </div>
          </div>
        )}

        {/* Final Points Result Banner */}
        {(() => {
          let verdictTitle = '0 points added';
          let verdictSubtitle = certificate.statusReason || '0 points added under KTU regulations.';
          let isSuccess = finalPoints > 0;

          if (finalPoints > 0) {
            verdictTitle = 'Certificate accepted';
            verdictSubtitle = `${finalPoints} points added to your degree total`;
          } else if (certificate.ruleEvaluationStatus === 'INSUFFICIENT_RULE_DATA' || certificate.processingStatus === 'INSUFFICIENT_RULE_DATA') {
            verdictTitle = 'Certificate accepted';
            verdictSubtitle = "We couldn't determine the event level needed to calculate the points.";
          } else if (certificate.evidenceStatus === 'VALID_EVIDENCE' && (certificate.processingStatus === 'NOT_ELIGIBLE' || certificate.ruleEvaluationStatus === 'NOT_ELIGIBLE')) {
            verdictTitle = 'Certificate accepted';
            verdictSubtitle = certificate.statusReason || 'This activity does not meet the requirements of an eligible activity under your KTU scheme.';
          } else if (certificate.evidenceStatus === 'INVALID_EVIDENCE') {
            verdictTitle = 'Document not accepted';
            verdictSubtitle = certificate.statusReason || 'This document does not provide evidence of completed participation or achievement.';
          } else if (certificate.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || certificate.processingStatus === 'INSUFFICIENT_EVIDENCE') {
            verdictTitle = 'Document needs better copy';
            verdictSubtitle = certificate.statusReason || "We couldn't read enough information from this document. Please upload a clearer copy.";
          } else if (certificate.processingStatus === 'DUPLICATE') {
            verdictTitle = 'Duplicate document';
            verdictSubtitle = '0 points added (already counted previously)';
          }

          return (
            <div
              style={{
                background: isSuccess ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isSuccess ? 'rgba(52, 211, 153, 0.25)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.95rem 1.15rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: isSuccess ? 'var(--color-success-text)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {verdictTitle}
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {verdictSubtitle}
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isSuccess ? 'var(--color-success-text)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {isSuccess ? `+${finalPoints}` : '0'} pts
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Content: Human Details & Stored Document */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {/* Certificate Details */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Certificate details</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.86rem' }}>
            {[
              { label: 'Activity category', value: certificate.activityCategory },
              { label: 'Activity type', value: certificate.subcategory },
              { label: 'Course / Event', value: certificate.eventName },
              { label: 'Issued by', value: certificate.organizer },
              { label: 'Achievement', value: certificate.achievement },
              { label: 'Level', value: certificate.level },
              { label: 'Duration', value: certificate.duration },
              { label: 'Certificate date', value: certificate.certificateDate ? new Date(certificate.certificateDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
              { label: 'Participant', value: certificate.participantName },
              { label: 'Certificate number', value: certificate.certificateNumber || null },
              { label: 'Points awarded', value: `${finalPoints} points` },
              { label: 'Reason', value: certificate.statusReason }
            ]
              .filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
              .map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                    padding: '0.55rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item.label}:</span>
                  <strong style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word', maxWidth: '100%' }}>
                    {String(item.value)}
                  </strong>
                </div>
              ))}
          </div>
        </div>

        {/* Document Preview & File Info */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
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
              padding: '1rem',
              textAlign: 'center',
              minHeight: '240px'
            }}
          >
            {certificate.mimeType === 'application/pdf' ? (
              <iframe
                src={certService.getFileUrl(certificate._id)}
                title="Certificate PDF Preview"
                style={{ width: '100%', height: '320px', border: 'none', borderRadius: 'var(--radius-sm)' }}
              />
            ) : certificate.mimeType && certificate.mimeType.startsWith('image/') ? (
              <img
                src={certService.getFileUrl(certificate._id)}
                alt="Certificate Document"
                style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              />
            ) : (
              <div>
                <FileText size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{certificate.originalFilename}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {certificate.mimeType} • {(certificate.fileSizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Technical Verification Details (For Auditing / Transparency) */}
      <details
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem'
        }}
      >
        <summary style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
          Technical Verification Details & Audit Log
        </summary>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.78rem' }}>
            {certificate.fileHash && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>SHA-256 Hash: </span>
                <span className="mono" style={{ color: 'var(--text-primary)' }}>{certificate.fileHash.slice(0, 20)}...</span>
              </div>
            )}
            {certificate.matchedRuleId && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rule ID: </span>
                <span className="mono" style={{ color: 'var(--text-primary)' }}>{certificate.matchedRuleId}</span>
              </div>
            )}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Document ID: </span>
              <span className="mono" style={{ color: 'var(--text-primary)' }}>{certificate._id}</span>
            </div>
          </div>

          {/* Engine Calculation Trace Steps */}
          {trace.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <h5 style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Engine Trace Steps
              </h5>
              {trace.map((stepItem, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(10, 13, 20, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}
                    >
                      {stepItem.step || idx + 1}
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{stepItem.name}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 1.6rem', lineHeight: 1.4 }}>
                    {stepItem.description}
                  </p>
                  {stepItem.data && (
                    <div style={{ marginLeft: '1.6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem', fontSize: '0.76rem' }}>
                      {Object.entries(stepItem.data).map(([k, v]) => (
                        <div key={k} style={{ wordBreak: 'break-word' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{String(v ?? 'N/A')}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
};


