import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { rulesService } from '../services/rulesService';
import { Button } from '../components/common/Button';
import { Award, ShieldCheck, ArrowRight } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    registerNumber: '',
    program: 'B.Tech',
    branch: 'Computer Science and Engineering',
    admissionYear: 2022,
    entryType: 'regular',
    curriculumRegulation: ''
  });

  const [resolution, setResolution] = useState({
    scheme: '2019',
    ruleVersion: '2019-v1',
    requiredPoints: 100,
    maximumPoints: 100,
    joiningSemester: 1,
    description: '4-Year Regular B.Tech under 2019 Regulation'
  });

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();

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
      [name]: name === 'admissionYear' ? parseInt(value, 10) : value
    }));
  };

  // Dynamically resolve scheme from official backend rules engine
  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      try {
        const res = await rulesService.previewScheme({
          admissionYear: formData.admissionYear,
          entryType: formData.entryType,
          curriculumRegulation: formData.curriculumRegulation || undefined
        });
        if (isMounted && res?.resolution) {
          setResolution(res.resolution);
        }
      } catch (err) {
        console.error('Failed to preview scheme resolution:', err);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [formData.admissionYear, formData.entryType, formData.curriculumRegulation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      success('Account created! Welcome to KTU Activity Points platform.');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
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
            <Award size={26} />
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.8rem)', fontWeight: 800, marginBottom: '0.35rem' }}>
            Create Student Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Enter your academic profile to resolve your applicable KTU regulation & quota
          </p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
          <form onSubmit={handleSubmit}>
            {/* Personal Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Rahul S. Nair"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="rahul@college.edu.in"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                autoComplete="new-password"
              />
            </div>

            {/* Academic Details */}
            <div style={{ margin: '1.25rem 0 1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.04em' }}>
                KTU Academic Profile
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">KTU Register Number</label>
                  <input
                    type="text"
                    name="registerNumber"
                    required
                    placeholder="e.g. TKM21CS042"
                    value={formData.registerNumber}
                    onChange={handleChange}
                    className="form-input mono"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch / Department</label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="form-select"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Admission Year</label>
                  <select
                    name="admissionYear"
                    value={formData.admissionYear}
                    onChange={handleChange}
                    className="form-select mono"
                  >
                    {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Entry Type</label>
                  <select
                    name="entryType"
                    value={formData.entryType}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="regular">Regular Entry (4-Year B.Tech)</option>
                    <option value="lateral">Lateral Entry (Diploma to 2nd Year)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Scheme Resolution Preview */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.15rem',
                margin: '1.25rem 0 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <ShieldCheck size={22} color="#818cf8" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Resolved Scheme: {resolution.scheme} ({resolution.ruleVersion})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Joining Sem {resolution.joiningSemester} • {resolution.description}
                  </div>
                </div>
              </div>
              <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }}>
                {resolution.requiredPoints} Required Points
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              style={{ width: '100%' }}
              size="lg"
              icon={ArrowRight}
            >
              Register & Access Dashboard
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

