/**
 * Abstract CertificateAnalyzer interface
 * Enables swappable document understanding models (Gemini, Custom ML, Fine-tuned LLM)
 */
export class CertificateAnalyzer {
  /**
   * Analyze document text / image and extract structured facts
   * @param {Object} input
   * @param {string} [input.text] - Extracted textual content
   * @param {Buffer} [input.buffer] - Document file buffer
   * @param {string} [input.mimeType] - MIME type
   * @param {string} [input.filename] - Filename
   * @returns {Promise<Object>} Structured fact output
   */
  async analyze(input) {
    throw new Error('analyze() must be implemented by concrete CertificateAnalyzer');
  }
}
