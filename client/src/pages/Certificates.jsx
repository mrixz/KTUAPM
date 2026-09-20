import React, { useState, useEffect } from 'react';
import { certService } from '../services/certService';
import { CertTable } from '../components/certificates/CertTable';
import { PageHeader } from '../components/common/PageHeader';
import { UploadCloud, Search, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const STATUS_CHIPS = [
  { value: '', label: 'All' },
  { value: 'COUNTED', label: 'Verified' },
  { value: 'NEEDS_REVIEW', label: 'Pending Review' },
  { value: 'LOW_CONFIDENCE', label: 'Low Confidence' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'FAILED', label: 'Not Counted' },
];

export const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  });
  const { error, success } = useNotification();

  const fetchCertificates = async (overrideFilters) => {
    try {
      setLoading(true);
      const data = await certService.getCertificates(overrideFilters || filters);
      setCertificates(data.certificates || []);
    } catch (err) {
      error('Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.sortBy, filters.sortOrder]);

  const handleStatusChip = (value) => {
    setFilters((f) => ({ ...f, status: value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCertificates();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this certificate?')) {
      try {
        await certService.deleteCertificate(id);
        success('Certificate removed successfully.');
        fetchCertificates();
      } catch (err) {
        error(err.response?.data?.message || 'Failed to delete certificate.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <PageHeader
        title="My Certificates"
        subtitle="All the activity certificates you've uploaded, along with their status and points."
        actions={
          <>
            <button
              onClick={() => fetchCertificates()}
              className="btn btn-secondary btn-sm"
              aria-label="Refresh list"
              title="Refresh"
            >
              <RefreshCw size={15} />
              <span className="desktop-only" style={{ display: 'inline' }}>Refresh</span>
            </button>
            <Link to="/upload" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary">
                <UploadCloud size={16} />
                Upload Certificate
              </button>
            </Link>
          </>
        }
      />

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        {/* Search row */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.875rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by certificate name or activity…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="form-input"
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
            Search
          </button>
        </form>

        {/* Status filter chips */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span className="meta-text" style={{ marginRight: '0.2rem', flexShrink: 0 }}>Filter:</span>
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleStatusChip(chip.value)}
              className={`chip${filters.status === chip.value ? ' chip-active' : ''}`}
              type="button"
            >
              {chip.label}
            </button>
          ))}

          {/* Sort selector — secondary, compact */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters({ ...filters, sortBy, sortOrder });
            }}
            className="form-select"
            style={{
              marginLeft: 'auto',
              width: 'auto',
              minWidth: '140px',
              fontSize: '0.82rem',
              padding: '0.3rem 0.7rem',
              minHeight: '36px',
            }}
            aria-label="Sort order"
          >
            <option value="uploadedAt-desc">Newest first</option>
            <option value="uploadedAt-asc">Oldest first</option>
            <option value="finalPoints-desc">Highest points</option>
            <option value="finalPoints-asc">Lowest points</option>
          </select>
        </div>
      </div>

      {/* Table/Card List */}
      <CertTable certificates={certificates} onDelete={handleDelete} loading={loading} />
    </div>
  );
};
