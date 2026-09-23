import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Copy, XCircle } from 'lucide-react';

// Student-facing status labels (replaces technical status codes)
const STATUS_CONFIG = {
  COUNTED: {
    cls: 'badge-counted',
    icon: <CheckCircle2 size={11} />,
    label: 'Certificate Accepted',
  },
  VALID_EVIDENCE: {
    cls: 'badge-counted',
    icon: <CheckCircle2 size={11} />,
    label: 'Certificate Accepted',
  },
  PROCESSING: {
    cls: 'badge-processing',
    icon: <Clock size={11} />,
    label: 'Checking Certificate',
  },
  LOW_CONFIDENCE: {
    cls: 'badge-review',
    icon: <AlertTriangle size={11} />,
    label: 'Needs Clearer Document',
  },
  NEEDS_REVIEW: {
    cls: 'badge-review',
    icon: <AlertTriangle size={11} />,
    label: 'Needs Clearer Document',
  },
  INSUFFICIENT_EVIDENCE: {
    cls: 'badge-review',
    icon: <AlertTriangle size={11} />,
    label: 'Unconfirmed Document',
  },
  DUPLICATE: {
    cls: 'badge-duplicate',
    icon: <Copy size={11} />,
    label: 'Already Counted',
  },
  NOT_ELIGIBLE: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'No Points Awarded',
  },
  INVALID_EVIDENCE: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Invalid Document',
  },
  REJECTED: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Not Eligible',
  },
  FAILED: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Processing Failed',
  },
  TEXT_EXTRACTION_FAILED: {
    cls: 'badge-failed',
    icon: <XCircle size={11} />,
    label: 'Read Failed',
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
