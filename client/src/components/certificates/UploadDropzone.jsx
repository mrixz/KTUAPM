import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Sparkles, Scale, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotification } from '../../context/NotificationContext';
import { certService } from '../../services/certService';
import confetti from 'canvas-confetti';

export const UploadDropzone = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const { success, error, warning } = useNotification();

  const pipelineSteps = [
    { title: 'Upload & Storage', desc: 'Generating SHA-256 hash & secure storage reference' },
    { title: 'Document Extraction', desc: 'Parsing PDF text structure & layout blocks' },
    { title: 'Gemini 2.5 Flash Understanding', desc: 'Extracting activity category, level, achievement & dates' },
    { title: 'Deterministic Rule Engine', desc: 'Matching KTU scheme regulations & evaluating category caps' },
    { title: 'Trace & Point Allocation', desc: 'Points awarded and explainable trace recorded' }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      error('Invalid file format. Please upload a PDF, PNG, or JPG certificate.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      error('File size exceeds 10MB limit.');
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const triggerUploadAndProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setCurrentStep(1);

    try {
      // Step interval animation for realistic visual feedback
      const timer1 = setTimeout(() => setCurrentStep(2), 700);
      const timer2 = setTimeout(() => setCurrentStep(3), 1600);
      const timer3 = setTimeout(() => setCurrentStep(4), 2500);

      // Execute synchronous upload & pipeline processing
      const data = await certService.uploadCertificate(file, true);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setCurrentStep(5);
      setResult(data.certificate);

      if (data.certificate.processingStatus === 'COUNTED') {
        success(`Success! ${data.certificate.finalPoints} points awarded under rule ${data.certificate.matchedRuleId}.`);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (data.certificate.processingStatus === 'DUPLICATE') {
        warning(data.certificate.statusReason || 'Duplicate certificate detected.');
      } else {
        warning(`Certificate uploaded. Status: ${data.certificate.processingStatus} (${data.certificate.statusReason})`);
      }

      if (onUploadSuccess) {
        onUploadSuccess(data.certificate);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to process certificate.');
    } finally {
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setCurrentStep(0);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(2rem, 6vw, 3.5rem) 1.25rem',
            textAlign: 'center',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(22, 28, 48, 0.4)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            transition: 'all var(--transition-normal)'
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--accent-primary)'
            }}
          >
            <UploadCloud size={28} />
          </div>
          <h3 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.25rem)', marginBottom: '0.35rem' }}>
            Upload Activity Certificate
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.4 }}>
            Drag & drop your certificate or <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>tap to browse files</span>
          </p>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Supported: PDF, PNG, JPG (Max 10MB) • Stored securely
          </div>
        </div>
      ) : (
        <div className="glass-card">
          {/* File Selected Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  flexShrink: 0
                }}
              >
                <FileText size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem', wordBreak: 'break-word' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                </div>
              </div>
            </div>

            {!processing && (
              <Button variant="secondary" size="sm" onClick={resetUpload}>
                Change File
              </Button>
            )}
          </div>

          {/* Pipeline Tracker */}
          <div style={{ margin: '1.25rem 0' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Automated Processing Pipeline
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {pipelineSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum || (!processing && result);
                const isCurrent = currentStep === stepNum && processing;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: isCurrent
                        ? 'rgba(99, 102, 241, 0.12)'
                        : isDone
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        isCurrent
                          ? 'rgba(99, 102, 241, 0.4)'
                          : isDone
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'var(--border-subtle)'
                      }`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: isDone
                          ? '#10b981'
                          : isCurrent
                          ? 'var(--accent-primary)'
                          : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {isDone ? <CheckCircle2 size={13} /> : stepNum}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action or Result */}
          {result ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                textAlign: 'center'
              }}
            >
              <h4 style={{ color: '#34d399', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                {result.finalPoints > 0 ? `+${result.finalPoints} Activity Points Awarded!` : 'Processing Completed'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
                Activity: <strong>{result.certificateTitle}</strong> • Rule:{' '}
                <span className="mono">{result.matchedRuleId || 'N/A'}</span>
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem' }}>
                <Button onClick={resetUpload} variant="secondary" icon={RefreshCw}>
                  Upload Another
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={triggerUploadAndProcess}
              loading={processing}
              style={{ width: '100%' }}
              size="lg"
              icon={Sparkles}
            >
              {processing ? 'Processing Document...' : 'Start AI Analysis & Rule Evaluation'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

