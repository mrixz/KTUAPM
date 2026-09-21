import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Award, Lock, Mail, ArrowRight, Eye, EyeOff, UploadCloud, CheckCircle2, BarChart2 } from 'lucide-react';

export const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await login(formData);
      success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const HOW_IT_WORKS = [
    { icon: <UploadCloud size={15} aria-hidden="true" />, text: 'Upload your activity certificates' },
    { icon: <CheckCircle2 size={15} aria-hidden="true" />, text: 'We calculate your KTU Activity Points automatically' },
    { icon: <BarChart2 size={15} aria-hidden="true" />, text: 'Track your progress towards the graduation requirement' },
  ];

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.12) 0%, var(--bg-primary) 70%)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand + description */}
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
            KTU <span className="text-gradient">Activity Points</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
            Student portal for tracking KTU Activity Points
          </p>

          {/* How it works */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.06)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              How it works
            </div>
            <ol
              style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0, padding: 0 }}
              aria-label="How KTUAPM works"
            >
              {HOW_IT_WORKS.map((step, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#a5b4fc', flexShrink: 0 }}>{step.icon}</span>
                  {step.text}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">KTU Student Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  required
                  placeholder="student@college.edu.in"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="email"
                  aria-required="true"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="current-password"
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

            <Button
              type="submit"
              loading={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
              size="lg"
              icon={ArrowRight}
            >
              Sign In to Dashboard
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
            New KTU student?{' '}
            <Link
              to="/auth/register"
              style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Register your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
