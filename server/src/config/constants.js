export const SCHEMES = {
  SCHEME_2019: '2019',
  SCHEME_2024: '2024'
};

export const ENTRY_TYPES = {
  REGULAR: 'regular',
  LATERAL: 'lateral'
};

export const PROCESSING_STATUS = {
  PROCESSING: 'PROCESSING',
  COUNTED: 'COUNTED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  DUPLICATE: 'DUPLICATE',
  FAILED: 'FAILED'
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  ACCEPTABLE: 0.70,
  MINIMUM: 0.60
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
