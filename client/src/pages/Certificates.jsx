import React, { useState, useEffect } from 'react';
import { certService } from '../services/certService';
import { CertTable } from '../components/certificates/CertTable';
import { Button } from '../components/common/Button';
import { UploadCloud, Search, Filter, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

export const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });
  const { error, success } = useNotification();

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await certService.getCertificates(filters);
      setCertificates(data.certificates || []);
    } catch (err) {
      error('Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [filters.category, filters.status, filters.sortBy, filters.sortOrder]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: '1 1 240px' }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.8rem)', margin: 0 }}>My Certificates</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
            Manage, filter, and inspect verified activity certificates and calculation traces
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchCertificates}>
            Refresh
          </Button>
          <Link to="/upload" style={{ textDecoration: 'none' }}>
            <Button icon={UploadCloud}>Upload Certificate</Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: 'clamp(1rem, 3vw, 1.25rem)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 min(100%, 220px)', position: 'relative', minWidth: '180px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search event, title, cert no..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ flex: '1 1 min(100%, 140px)', minWidth: '130px' }}>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="COUNTED">Counted</option>
              <option value="PROCESSING">Processing</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="LOW_CONFIDENCE">Low Confidence</option>
              <option value="DUPLICATE">Duplicate</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ flex: '1 1 min(100%, 150px)', minWidth: '140px' }}>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="form-select"
            >
              <option value="uploadedAt-desc">Newest Uploads</option>
              <option value="uploadedAt-asc">Oldest Uploads</option>
              <option value="finalPoints-desc">Highest Points</option>
              <option value="finalPoints-asc">Lowest Points</option>
            </select>
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Certificates Table / Card List */}
      <CertTable
        certificates={certificates}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
};

