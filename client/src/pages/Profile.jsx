import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { User, ShieldCheck, Award, Save, RefreshCw } from 'lucide-react';

export const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    branch: profile?.branch || 'Computer Science and Engineering',
    program: profile?.program || 'B.Tech',
    admissionYear: profile?.admissionYear || 2022,
    entryType: profile?.entryType || 'regular'
  });
  const [loading, setLoading] = useState(false);
  const { success, error } = useNotification();

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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.updateProfile(formData);
      await refreshProfile();
      success('Academic profile updated. Scheme rules re-resolved.');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.8rem)', margin: 0 }}>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          Your academic details and KTU Activity Point requirement for graduation
        </p>
      </div>

      {/* Scheme Card */}
      <div
        className="glass-card"
        style={{
          background: 'var(--gradient-hero)',
          border: '1px solid var(--accent-primary-border)',
          padding: 'clamp(1.1rem, 3.5vw, 1.5rem)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <ShieldCheck size={24} color="#818cf8" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.25 }}>
              KTU Scheme {profile?.scheme}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.15rem 0 0' }}>
              Applied based on your admission year ({profile?.admissionYear}) and{' '}
              {profile?.entryType === 'lateral' ? 'Lateral Entry' : 'Regular Entry'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Points to graduate</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success-text)', marginTop: '0.2rem' }}>
              {profile?.requiredPoints} pts
            </div>
          </div>

          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Maximum counted</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-info-text)', marginTop: '0.2rem' }}>
              {profile?.maximumPoints} pts
            </div>
          </div>

          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Entry type</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize', marginTop: '0.25rem' }}>
              {profile?.entryType === 'lateral' ? 'Lateral (3-year)' : 'Regular (4-year)'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          <a href="/opportunities" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            View the Earn Points guide →
          </a>
          {' '}to see all activities that qualify under Scheme {profile?.scheme}.
        </div>
      </div>

      {/* Profile Form */}
      <div className="glass-card" style={{ padding: 'clamp(1.1rem, 3.5vw, 1.5rem)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Academic Details</h3>

        <form onSubmit={handleUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" disabled value={user?.name || ''} className="form-input" style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" disabled value={user?.email || ''} className="form-input" style={{ opacity: 0.7 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">KTU Register Number</label>
              <input type="text" disabled value={profile?.registerNumber || ''} className="form-input mono" style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Branch / Department</label>
              <select name="branch" value={formData.branch} onChange={handleChange} className="form-select">
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Admission Year</label>
              <select name="admissionYear" value={formData.admissionYear} onChange={handleChange} className="form-select mono">
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Entry Type</label>
              <select name="entryType" value={formData.entryType} onChange={handleChange} className="form-select">
                <option value="regular">Regular Entry (4-Year)</option>
                <option value="lateral">Lateral Entry (3-Year)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="submit" loading={loading} icon={Save} style={{ width: 'auto', minWidth: '160px' }}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

