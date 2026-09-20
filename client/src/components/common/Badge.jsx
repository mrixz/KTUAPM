import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Copy, XCircle, HelpCircle } from 'lucide-react';

export const Badge = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

  let badgeClass = 'badge-processing';
  let icon = <Clock size={12} />;
  let label = status;

  if (norm === 'COUNTED') {
    badgeClass = 'badge-counted';
    icon = <CheckCircle2 size={12} />;
    label = 'Verified & Counted';
  } else if (norm === 'PROCESSING') {
    badgeClass = 'badge-processing';
    icon = <Clock size={12} />;
    label = 'Processing AI';
  } else if (norm === 'LOW_CONFIDENCE' || norm === 'NEEDS_REVIEW') {
    badgeClass = 'badge-review';
    icon = <AlertTriangle size={12} />;
    label = norm === 'LOW_CONFIDENCE' ? 'Low Confidence' : 'Needs Review';
  } else if (norm === 'DUPLICATE') {
    badgeClass = 'badge-duplicate';
    icon = <Copy size={12} />;
    label = 'Duplicate';
  } else if (norm === 'REJECTED' || norm === 'FAILED') {
    badgeClass = 'badge-failed';
    icon = <XCircle size={12} />;
    label = norm === 'FAILED' ? 'Failed' : 'Rejected';
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};
