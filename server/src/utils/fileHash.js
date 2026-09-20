import crypto from 'crypto';

/**
 * Generate SHA-256 hash of a file buffer
 * @param {Buffer} buffer 
 * @returns {string} hex hash
 */
export const calculateFileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Normalize string for semantic matching (remove special chars, lowercase, trim)
 * @param {string} str 
 * @returns {string}
 */
export const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
