/**
 * AuthenticityExtensionPoint
 *
 * Skeleton for future certificate authenticity/fraud detection infrastructure.
 * This class is intentionally NOT implemented and must NOT assign, adjust, or
 * override any points. All point calculations remain the exclusive domain of
 * the deterministic KTU rule engine (PointCalculationEngine.js).
 *
 * This extension point documents WHERE future authenticity checks should hook
 * into the pipeline (AFTER evidence validation, BEFORE point calculation) and
 * WHAT signals they might surface as supplementary metadata.
 *
 * IMPORTANT INVARIANT:
 * Gemini and any external authenticity service MUST NEVER directly determine
 * final KTU activity points. They produce signals. The deterministic rule engine
 * produces points.
 *
 * Future authenticity signals (none implemented yet):
 *  - QR code embedded in certificate → URL/ID resolution check
 *  - Digital signature embedded in PDF → cryptographic verification
 *  - Credential URL (e.g. Coursera certificate URL) → web scrape / API validation
 *  - Certificate serial number → issuer database lookup (where API available)
 *  - Image tampering indicators → metadata / EXIF inconsistency
 *  - Issuer domain → WHOIS / SSL certificate validity check
 *
 * Pipeline hook location (in CertificateProcessingPipeline.js):
 *  Between step 10 (Student Attribution) and step 11 (Semantic Duplicate Check).
 *  Must be fully async and must never block or fail-hard if external APIs are unreachable.
 *  Must return `{ authenticity: 'VERIFIED' | 'UNVERIFIED' | 'SUSPICIOUS', checks: Object }`.
 *
 * NEVER add to this file:
 *  - Point calculation
 *  - Evidence validity decisions (those belong in EvidenceValidator.js)
 *  - Student data processing / PII enrichment
 *  - Automatic rejection logic (authenticity is advisory, not deterministic)
 */
export class AuthenticityExtensionPoint {
  /**
   * Placeholder that runs zero actual checks.
   * The result MUST be treated as advisory metadata only, never as a hard gate.
   *
   * @param {Object} _params
   * @param {string} _params.certificateText - Extracted certificate text
   * @param {Object} _params.aiResult - Gemini-extracted facts
   * @param {string} _params.mimeType - File MIME type
   * @param {string} _params.storageKey - Storage key (for future buffer retrieval)
   * @returns {Promise<{ authenticity: string, checks: Object, notes: string[] }>}
   */
  static async evaluate(_params) {
    // Not yet implemented. Returns UNVERIFIED (neutral) to avoid blocking any student.
    return {
      authenticity: 'UNVERIFIED',
      checks: {
        qrCodeResolved: null,
        digitalSignatureValid: null,
        credentialUrlVerified: null,
        serialNumberVerified: null,
        issuerDomainValid: null
      },
      notes: [
        'Authenticity verification not yet implemented.',
        'All checks return null (unverified) and must not affect point calculation.'
      ]
    };
  }
}
