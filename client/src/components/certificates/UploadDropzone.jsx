import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { certService } from '../../services/certService';
import { Badge } from '../common/Badge';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

// Format bytes into readable format without false 0.00 MB rounding
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Student-friendly processing step messages
const PROCESSING_STEPS = [
  { label: 'Reading your certificate…', desc: 'Scanning the document for text and details' },
  { label: 'Identifying the activity…', desc: 'Matching the certificate to a KTU activity category' },
  { label: 'Checking KTU rules…', desc: 'Looking up the applicable rule for your scheme' },
  { label: 'Calculating points…', desc: 'Applying category limits and computing the final award' },
  { label: 'Done!', desc: 'Your certificate has been processed' },
];

export const UploadDropzone = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [showTrace, setShowTrace] = useState(false);
  const inputRef = useRef(null);
  const isUploadingRef = useRef(false);
  const { success, error, warning } = useNotification();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
  };

  const handleFileSelected = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size === 0) {
      error('The selected certificate file is empty. Please choose a valid file.');
      return;
    }

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const fileName = selectedFile.name?.toLowerCase() || '';
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidMime = selectedFile.type && validTypes.includes(selectedFile.type.toLowerCase());

    if (!hasValidMime && !hasValidExtension) {
      error('Please upload a PDF, PNG, or JPG certificate.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      error('The file is larger than 10 MB. Please compress it and try again.');
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setShowTrace(false);
  };

  const triggerUpload = async () => {
    if (!file || processing || isUploadingRef.current) return;
    if (!(file instanceof File) && !(file instanceof Blob)) {
      error('Invalid file selection. Please select the file again.');
      return;
    }
    if (file.size === 0) {
      error('The selected certificate file is empty. Please choose a valid file.');
      return;
    }
    isUploadingRef.current = true;
    setProcessing(true);
    setCurrentStep(1);

    try {
      // 1. Upload asynchronously so the file transfers in 1-2s and mobile connections
      //    do not time out or drop during 15-20s synchronous AI processing
      const uploadData = await certService.uploadCertificate(file, false);
      let cert = uploadData?.certificate;

      if (!cert || !cert._id) {
        throw new Error('Upload response did not return certificate record.');
      }

      // 2. If the backend already processed synchronously, use it immediately
      if (cert.processingStatus && cert.processingStatus !== 'PROCESSING') {
        setCurrentStep(5);
        setResult(cert);
      } else {
        // 3. Otherwise poll status with visual progression across steps
        let pollCount = 0;
        const maxPolls = 35; // 35 * 1.5s = ~50s

        while (pollCount < maxPolls) {
          await new Promise((r) => setTimeout(r, 1500));
          pollCount++;

          if (pollCount === 1) setCurrentStep(2);
          else if (pollCount === 3) setCurrentStep(3);
          else if (pollCount === 5) setCurrentStep(4);

          try {
            const pollData = await certService.getCertificateById(cert._id);
            if (pollData?.certificate && pollData.certificate.processingStatus !== 'PROCESSING') {
              cert = pollData.certificate;
              break;
            }
          } catch (pollErr) {
            // Transient network hiccups during polling are tolerated
            console.warn('Status poll retry:', pollErr.message);
          }
        }

        setCurrentStep(5);
        setResult(cert);
      }

      if (cert.processingStatus === 'COUNTED') {
        success(`${cert.finalPoints} points awarded!`);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else if (cert.processingStatus === 'DUPLICATE') {
        warning(cert.statusReason || 'This certificate appears to have already been uploaded.');
      } else if (cert.processingStatus === 'PROCESSING') {
        warning('Certificate uploaded! Analysis is continuing in the background — check your dashboard shortly.');
      } else {
        warning('Certificate uploaded. Please review the details below.');
      }

      if (onUploadSuccess) onUploadSuccess(cert);
    } catch (err) {
      // Reset step to 0 so "Done!" is never falsely displayed on failure
      setCurrentStep(0);

      // 422 = pipeline completed but failed (FAILED / LOW_CONFIDENCE etc.)
      const serverCert = err?.response?.data?.certificate;
      if (err?.response?.status === 422 && serverCert) {
        setResult(serverCert);
        if (onUploadSuccess) onUploadSuccess(serverCert);
      } else {
        const serverMessage = err?.response?.data?.message;
        const status = err?.response?.status;
        if (status === 401) {
          error('Your session has expired. Please log in again.');
        } else if (serverMessage) {
          error(serverMessage);
        } else if (!err.response) {
          error('The server could not be reached. Please check your internet connection.');
        } else {
          error('We had trouble reading this certificate. Please check the file and try again.');
        }
      }
    } finally {
      setProcessing(false);
      isUploadingRef.current = false;
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setCurrentStep(0);
    setShowTrace(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const isSuccess = result && result.processingStatus === 'COUNTED';
  const isDuplicate = result && result.processingStatus === 'DUPLICATE';
  const isLowConf =
    result &&
    (result.processingStatus === 'LOW_CONFIDENCE' ||
      result.processingStatus === 'NEEDS_REVIEW' ||
      result.processingStatus === 'INSUFFICIENT_EVIDENCE');
  const isFailed =
    result &&
    (result.processingStatus === 'FAILED' ||
      result.processingStatus === 'REJECTED' ||
      result.processingStatus === 'NOT_ELIGIBLE');

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
      {/* ── Drop Zone (no file selected) ── */}
      {!file && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload certificate — tap or drag a file here"
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(2.25rem, 7vw, 4rem) 1.5rem',
            textAlign: 'center',
            background: dragActive ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all var(--transition-normal)',
            outline: 'none',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-hidden="true"
          />

          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--accent-primary-subtle)',
              border: '1px solid var(--accent-primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.1rem',
              color: '#a5b4fc',
            }}
          >
            <UploadCloud size={26} />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Select your certificate
          </h3>
          <p className="body-text" style={{ marginBottom: '1rem' }}>
            <span className="desktop-only" style={{ display: 'inline' }}>Drag and drop here, or </span>
            <span style={{ color: '#a5b4fc', fontWeight: 600 }}>tap to choose a file</span>
          </p>
          <div className="meta-text">PDF, JPG, or PNG · Maximum 10 MB</div>
        </div>
      )}

      {/* ── File Selected — Processing & Result ── */}
      {file && (
        <div className="glass-card">
          {/* File info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: 'var(--accent-primary-subtle)',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                color: '#a5b4fc',
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-word' }}>
                {file.name}
              </div>
              <div className="meta-text">
                {formatFileSize(file.size)}
              </div>
            </div>
            {!processing && (
              <button
                onClick={resetUpload}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Change file
              </button>
            )}
          </div>

          {/* Processing steps */}
          {(processing || currentStep > 0) && (
            <div style={{ margin: '1.1rem 0' }}>
              <div className="label-text" style={{ marginBottom: '0.75rem' }}>
                Processing your certificate
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {PROCESSING_STEPS.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = currentStep > stepNum || (!processing && result);
                  const isCurrent = currentStep === stepNum && processing;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: isCurrent
                          ? 'var(--accent-primary-subtle)'
                          : isDone
                          ? 'var(--color-success-bg)'
                          : 'var(--bg-surface)',
                        border: `1px solid ${isCurrent ? 'var(--accent-primary-border)' : isDone ? 'var(--color-success-border)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: isDone ? 'var(--color-success)' : isCurrent ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                          transition: 'background 0.3s ease',
                        }}
                      >
                        {isDone ? <CheckCircle2 size={12} /> : stepNum}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: isCurrent ? '#a5b4fc' : 'var(--text-primary)' }}>
                          {step.label}
                        </div>
                        {isCurrent && (
                          <div className="meta-text" style={{ marginTop: '0.1rem' }}>{step.desc}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Success Result ── */}
          {result && isSuccess && (
            <div
              style={{
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={28} color="var(--color-success-text)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success-text)', marginBottom: '0.2rem' }}>
                +{result.finalPoints} Activity Points!
              </div>
              <div className="body-text" style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{result.certificateTitle}</strong> has been processed and saved to your account.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button onClick={resetUpload} className="btn btn-secondary btn-sm">
                  <RefreshCw size={14} />
                  Upload another
                </button>
                <Link to={`/certificates/${result._id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  View details <ArrowRight size={13} />
                </Link>
              </div>

              {/* Expandable "Why these points?" */}
              <button
                onClick={() => setShowTrace(!showTrace)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  margin: '0.875rem auto 0',
                }}
              >
                Why did I get {result.finalPoints} points?
                {showTrace ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showTrace && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    textAlign: 'left',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {result.calculationTrace?.length > 0 ? (
                    result.calculationTrace.map((step, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: i < result.calculationTrace.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                          {i + 1}. {step.name}
                        </div>
                        <div>{step.description}</div>
                      </div>
                    ))
                  ) : (
                    <p>
                      Under your applicable KTU scheme, this activity and event level qualify for{' '}
                      <strong style={{ color: 'var(--color-success-text)' }}>{result.finalPoints} Activity Points</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Review / Low Confidence Result ── */}
          {result && isLowConf && (
            <div
              style={{
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--color-warning-text)" />
                <div style={{ fontWeight: 700, color: 'var(--color-warning-text)' }}>
                  Please review this certificate
                </div>
              </div>
              <p className="body-text" style={{ marginBottom: '1rem' }}>
                We identified some details, but we're not fully confident in the result. Please check the information looks correct before submitting.
              </p>
              {result.finalPoints > 0 && (
                <div style={{ marginBottom: '0.875rem', fontWeight: 600 }}>
                  Calculated: <span style={{ color: 'var(--color-warning-text)' }}>{result.finalPoints} points</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link to={`/certificates/${result._id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  Review details
                </Link>
                <button onClick={resetUpload} className="btn btn-secondary btn-sm">
                  Try another file
                </button>
              </div>
            </div>
          )}

          {/* ── Failed / Error Result ── */}
          {result && isFailed && (
            <div
              style={{
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-danger-text)', marginBottom: '0.4rem' }}>
                We couldn't identify this certificate
              </div>
              <p className="body-text" style={{ marginBottom: '0.875rem' }}>
                {result.statusReason || 'We were unable to extract the required details from this document. Please check that the certificate is clear and readable.'}
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link to={`/certificates/${result._id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  Review manually
                </Link>
                <button onClick={resetUpload} className="btn btn-primary btn-sm">
                  Try another file
                </button>
              </div>
            </div>
          )}

          {/* ── Duplicate Result ── */}
          {result && isDuplicate && (
            <div
              style={{
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--color-warning-text)" />
                <div style={{ fontWeight: 700, color: 'var(--color-warning-text)' }}>
                  Duplicate Certificate
                </div>
              </div>
              <p className="body-text" style={{ marginBottom: '1rem' }}>
                {result.statusReason || 'This certificate has already been uploaded and counted toward your KTU activity points.'}
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link to={`/certificates/${result._id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  View details
                </Link>
                <button onClick={resetUpload} className="btn btn-secondary btn-sm">
                  Upload another file
                </button>
              </div>
            </div>
          )}

          {/* Submit button */}
          {!result && (
            <button
              onClick={triggerUpload}
              disabled={processing}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {processing ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Analysing certificate…
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Analyse Certificate
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
