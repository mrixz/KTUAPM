import { EvidenceValidator } from './EvidenceValidator.js';
import { EVIDENCE_STATUS, DOCUMENT_PURPOSES, REASON_CODES } from '../../config/constants.js';

export { EvidenceValidator };

/**
 * DocumentValidator (Backwards-compatible bridge)
 * Delegates to the comprehensive EvidenceValidator while preserving legacy type mappings
 * for existing test suites.
 */
export class DocumentValidator {
  /**
   * Validate whether extracted document text represents a genuine individual activity certificate
   * @param {Object} params
   * @param {string} params.text - Extracted text from PDF or OCR
   * @param {string} [params.filename=''] - Original filename
   * @param {string} [params.mimeType=''] - Document MIME type
   * @param {Object} [params.quality=null] - Extraction quality metrics
   * @returns {{
   *   isValidCertificate: boolean,
   *   evidenceStatus: string,
   *   documentType: string,
   *   documentPurpose: string,
   *   reasonCode: string,
   *   confidence: number,
   *   reason: string,
   *   checks: Object
   * }}
   */
  static validateDocument({ text = '', filename = '', mimeType = '', quality = null }) {
    const evalRes = EvidenceValidator.evaluateEvidence({ text, filename, mimeType, quality });
    const isValid = evalRes.evidenceStatus === EVIDENCE_STATUS.VALID_EVIDENCE;

    // Map new document purpose to legacy test-expected string identifiers
    let legacyType = evalRes.documentPurpose;
    if (isValid) {
      legacyType = 'certificate';
    } else if (evalRes.reasonCode === REASON_CODES.BLURRY_OR_LOW_QUALITY) {
      legacyType = 'blank_or_low_text';
    } else if (evalRes.documentPurpose === DOCUMENT_PURPOSES.POSTER || evalRes.reasonCode === REASON_CODES.PROMOTIONAL_MATERIAL) {
      legacyType = 'poster_or_announcement';
    } else if (evalRes.documentPurpose === DOCUMENT_PURPOSES.CAMPAIGN_MATERIAL || evalRes.reasonCode === REASON_CODES.CAMPAIGN_MATERIAL) {
      legacyType = 'political_or_student_org_poster';
    } else if (evalRes.documentPurpose === DOCUMENT_PURPOSES.UNRELATED_DOCUMENT || evalRes.reasonCode === REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE) {
      legacyType = 'unclassified_document';
    }

    return {
      isValidCertificate: isValid,
      evidenceStatus: evalRes.evidenceStatus,
      documentType: legacyType,
      documentPurpose: evalRes.documentPurpose,
      reasonCode: evalRes.reasonCode,
      confidence: isValid ? evalRes.confidence : 0,
      reason: evalRes.reason,
      checks: evalRes.checks,
      matchedPositiveMarkers: evalRes.checks?.completedActivityEvidence ? 1 : 0,
      matchedNegativeMarkers: (!evalRes.checks?.isNotPromotional || !evalRes.checks?.isNotPreEvent) ? 1 : 0
    };
  }
}
