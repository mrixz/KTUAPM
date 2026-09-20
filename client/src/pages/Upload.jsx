import React from 'react';
import { UploadDropzone } from '../components/certificates/UploadDropzone';
import { Sparkles, ShieldCheck, Scale, Cpu } from 'lucide-react';

export const Upload = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
          Upload Activity Certificate
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Our document understanding pipeline will extract structured activity facts with Gemini 2.5 Flash and compute official KTU points deterministically.
        </p>
      </div>

      <UploadDropzone />

      {/* Feature Highlights Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          maxWidth: '900px',
          margin: '1rem auto 0',
          width: '100%'
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex' }}>
            <Cpu size={22} />
          </div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>AI Document Understanding</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
            Gemini 2.5 Flash extracts titles, categories, dates, organizer, level & achievements without fabricating missing facts.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex' }}>
            <Scale size={22} />
          </div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>Deterministic Rule Engine</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
            Points are never invented by LLM; official versioned KTU rule matrices calculate exact points, caps, and adjustments.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--accent-emerald)', marginBottom: '0.5rem', display: 'flex' }}>
            <ShieldCheck size={22} />
          </div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>Full Explainability</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
            Every calculated point is backed by a 5-step traceable rationale for auditability and faculty verification.
          </p>
        </div>
      </div>
    </div>
  );
};
