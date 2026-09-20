import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Award, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData);
      success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || 'Invalid credentials. Please try again.');
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
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.12) 0%, var(--bg-primary) 70%)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
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
            KTU <span className="text-gradient">Activity Points</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Sign in to manage certificates and verify scheme points
          </p>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">KTU Student Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="student@tkmce.ac.in"
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
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                autoComplete="current-password"
              />
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

