import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { rulesService } from '../services/rulesService';
import { Button } from '../components/common/Button';
import { Award, ShieldCheck, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    registerNumber: '',
    program: 'B.Tech',
    branch: 'Computer Science and Engineering',
    admissionYear: '',       // empty = "Select admission year" placeholder shown
    entryType: '',           // empty = "Select entry type" placeholder shown
    curriculumRegulation: ''
  });

  const [resolution, setResolution] = useState(null);
  const [resolutionState, setResolutionState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();
  const abortRef = useRef(null);

  const branches = [
    'Computer Science and Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical and Electronics Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Chemical Engineering',
    'Biotechnology'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'admissionYear' ? (value === '' ? '' : parseInt(value, 10)) : value
    }));
  };

  // Fetch requirement preview whenever academic selectors change
  useEffect(() => {
    const { admissionYear, entryType } = formData;

    // Only fetch when both required academic fields are selected
    if (!admissionYear || !entryType) {
      setResolutionState('idle');
      setResolution(null);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setResolutionState('loading');
    // Clear stale results immediately so they're not shown as current
    setResolution(null);

    const fetchPreview = async () => {
      try {
        const res = await rulesService.previewScheme({
          admissionYear,
          entryType,
          curriculumRegulation: formData.curriculumRegulation || undefined
        });
        // Only apply if this request is still current
        if (!controller.signal.aborted && res?.resolution) {
          setResolution(res.resolution);
          setResolutionState('success');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Failed to preview scheme:', err);
          setResolutionState('error');
        }
      }
    };

    fetchPreview();

    return () => {
      controller.abort();
    };
  }, [formData.admissionYear, formData.entryType, formData.curriculumRegulation]);

  const academicInputsComplete =
    formData.admissionYear !== '' && formData.entryType !== '';

  const canSubmit =
    academicInputsComplete &&
    resolutionState === 'success' &&
    resolution !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await register(formData);
      success('Account created! Welcome to KTU Activity Points.');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const retryResolution = () => {
    // Trigger re-fetch by bumping a counter or re-running the effect
    // We achieve this by toggling a dummy state that the effect depends on
    setResolutionState('idle');
    setResolution(null);
    // Re-trigger effect by temporarily clearing and restoring admissionYear
    const yr = formData.admissionYear;
    const et = formData.entryType;
    setFormData((p) => ({ ...p, admissionYear: '', entryType: '' }));
    setTimeout(() => setFormData((p) => ({ ...p, admissionYear: yr, entryType: et })), 0);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        background: 'radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.15) 0%, var(--bg-primary) 75%)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--gradient-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: '0.85rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Award size={26} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.8rem)', fontWeight: 800, marginBottom: '0.35rem' }}>
            Create Student Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Your admission year and entry type determine how many activity points you need to graduate
          </p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Personal Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name</label>
                <input
                  type="text"
                  id="reg-name"
                  name="name"
                  required
                  placeholder="e.g. Rahul S. Nair"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="name"
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address</label>
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  required
                  placeholder="rahul@college.edu.in"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="email"
                  aria-required="true"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="reg-password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="new-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <EyeOff size={17} aria-hidden="true" />
                    : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Academic Details */}
            <fieldset
              style={{
                margin: '1.25rem 0 0',
                paddingTop: '1.25rem',
                border: 'none',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <legend
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                  letterSpacing: '0.04em',
                  fontWeight: 700,
                  paddingTop: '1.25rem'
                }}
              >
                KTU Academic Profile
              </legend>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-register-number">KTU Register Number</label>
                  <input
                    type="text"
                    id="reg-register-number"
                    name="registerNumber"
                    required
                    placeholder="e.g. TKM21CS042"
                    value={formData.registerNumber}
                    onChange={handleChange}
                    className="form-input mono"
                    style={{ textTransform: 'uppercase' }}
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-branch">Branch / Department</label>
                  <select
                    id="reg-branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="form-select"
                    aria-required="true"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-admission-year">Admission Year</label>
                  <select
                    id="reg-admission-year"
                    name="admissionYear"
                    value={formData.admissionYear}
                    onChange={handleChange}
                    className="form-select mono"
                    required
                    aria-required="true"
                  >
                    <option value="" disabled>Select admission year</option>
                    {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-entry-type">Entry Type</label>
                  <select
                    id="reg-entry-type"
                    name="entryType"
                    value={formData.entryType}
                    onChange={handleChange}
                    className="form-select"
                    required
                    aria-required="true"
                  >
                    <option value="" disabled>Select entry type</option>
                    <option value="regular">Regular Entry (4-Year B.Tech)</option>
                    <option value="lateral">Lateral Entry (Diploma to 2nd Year)</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Requirement Resolution Panel */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.15rem',
                margin: '1.25rem 0 1.5rem',
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {resolutionState === 'idle' && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select your admission year and entry type above to see your activity-point requirement.
                </p>
              )}

              {resolutionState === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Updating your requirements…
                  </span>
                </div>
              )}

              {resolutionState === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)' }}>
                    Could not load your requirement. Check your connection and try again.
                  </span>
                  <button
                    type="button"
                    onClick={retryResolution}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.3rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <RefreshCw size={13} aria-hidden="true" /> Retry
                  </button>
                </div>
              )}

              {resolutionState === 'success' && resolution && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <ShieldCheck size={22} color="#818cf8" style={{ flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Your activity-point requirement
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                        {resolution.description || `KTU Scheme ${resolution.scheme} · ${formData.entryType === 'lateral' ? 'Lateral Entry' : 'Regular Entry'}`}
                      </div>
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }}>
                    {resolution.requiredPoints} pts needed
                  </div>
                </div>
              )}
            </div>

            {!canSubmit && academicInputsComplete && resolutionState !== 'loading' && resolutionState !== 'error' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.75rem' }} role="status">
                Waiting for requirement data before you can register…
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!canSubmit}
              style={{ width: '100%' }}
              size="lg"
              icon={ArrowRight}
            >
              Register &amp; Access Dashboard
            </Button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)'
            }}
          >
            Already have an account?{' '}
            <Link
              to="/auth/login"
              style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
