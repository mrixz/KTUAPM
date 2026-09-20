import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Copy, XCircle } from 'lucide-react';

// Student-facing status labels (replaces technical status codes)
const STATUS_CONFIG = {
  COUNTED: {
    cls: 'badge-counted',
    icon: <CheckCircle2 size={11} />,
    label: 'Verified',
  },
  PROCESSING: {
    cls: 'badge-processing',
    icon: <Clock size={11} />,
    label: 'Processing',
  },
  LOW_CONFIDENCE: {
    cls: 'badge-review',
    icon: <AlertTriangle size={11} />,
    label: 'Needs Review',
  },
  NEEDS_REVIEW: {
    cls: 'badge-review',
    icon: <AlertTriangle size={11} />,
    label: 'Needs Review',
  },
  DUPLICATE: {
    cls: 'badge-duplicate',
    icon: <Copy size={11} />,
    label: 'Duplicate',
  },
  REJECTED: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Rejected',
  },
  FAILED: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Not Counted',
  },
};

export const Badge = ({ status, className = '' }) => {
  const key = (status || '').toUpperCase();
  const cfg = STATUS_CONFIG[key] || {
    cls: 'badge-processing',
    icon: <Clock size={11} />,
    label: status || 'Unknown',
  };

  return (
    <span className={`badge ${cfg.cls} ${className}`}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
};
