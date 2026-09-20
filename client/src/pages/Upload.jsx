import React from 'react';
import { UploadDropzone } from '../components/certificates/UploadDropzone';
import { PageHeader } from '../components/common/PageHeader';
import { FileSearch, BookOpen, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: <FileSearch size={20} />,
    title: 'We read your certificate',
    desc: 'We extract the activity name, organiser, date, event level, and achievement from your document.',
  },
  {
    icon: '📋',
    emoji: true,
    title: 'We identify the activity',
    desc: 'The activity is matched to the correct KTU category for your applicable scheme.',
  },
  {
    icon: <BookOpen size={20} />,
    title: 'KTU rules calculate the points',
    desc: 'Official KTU regulations — not AI — determine exactly how many points apply, including any category limits.',
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: 'Ready for faculty verification',
    desc: 'Your submission is saved and the calculated points are ready for your faculty to verify.',
  },
];

export const Upload = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page header */}
      <PageHeader
        title="Upload Certificate"
        subtitle="Upload your activity certificate and we'll extract the details and calculate the applicable KTU Activity Points."
        centered
      />

      {/* Dropzone */}
      <UploadDropzone />

      {/* How it works */}
      <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '1.1rem',
            letterSpacing: '0.01em',
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '0.875rem',
          }}
        >
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{ padding: '1rem', textAlign: 'center' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-primary-subtle)',
                  border: '1px solid var(--accent-primary-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.65rem',
                  color: '#a5b4fc',
                  fontSize: step.emoji ? '1.15rem' : undefined,
                }}
              >
                {step.icon}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  marginBottom: '0.2rem',
                }}
              >
                Step {idx + 1}
              </div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: 1.3 }}>
                {step.title}
              </h4>
              <p className="meta-text" style={{ lineHeight: 1.4 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
