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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Student Academic Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Your verified registration information and applicable KTU scheme rules
        </p>
      </div>

      {/* Scheme Resolution Card */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldCheck size={24} color="#818cf8" />
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
              Official KTU Scheme {profile?.scheme} ({profile?.ruleVersion})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              Resolved automatically from your admission year ({profile?.admissionYear}) & entry type ({profile?.entryType})
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Points</span>
            <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
              {profile?.requiredPoints} Pts
            </div>
          </div>

          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Maximum Applicable</span>
            <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {profile?.maximumPoints} Pts
            </div>
          </div>

          <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entry Status</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize', marginTop: '0.3rem' }}>
              {profile?.entryType} Entry
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Academic Details</h3>

        <form onSubmit={handleUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" disabled value={user?.name || ''} className="form-input" style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" disabled value={user?.email || ''} className="form-input" style={{ opacity: 0.7 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
            <Button type="submit" loading={loading} icon={Save}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
