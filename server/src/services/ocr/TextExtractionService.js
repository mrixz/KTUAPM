import pdfParse from 'pdf-parse';
import { logger } from '../../utils/logger.js';
import { EXTRACTION_SOURCES, REASON_CODES } from '../../config/constants.js';

let _workerInstance = null;
let _workerPromise = null;

/**
 * Get or initialize a singleton Tesseract.js worker
 * Uses lazy initialization so worker threads are only spun up when OCR is actually required.
 */
async function getOcrWorker() {
  if (_workerInstance) return _workerInstance;
  if (_workerPromise) return _workerPromise;

  _workerPromise = (async () => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      _workerInstance = worker;
      return _workerInstance;
    } catch (err) {
      _workerPromise = null;
      throw err;
    }
  })();

  return _workerPromise;
}

/**
 * Terminate the OCR worker if running (useful for cleanup and test isolation)
 */
export async function terminateOcrWorker() {
  if (_workerInstance) {
    try {
      await _workerInstance.terminate();
    } catch (_) {}
    _workerInstance = null;
    _workerPromise = null;
  }
}

/**
 * Extract embedded JPEG image streams from a PDF buffer in pure JS.
 * Scanner apps (CamScanner, Adobe Scan, phone scans) typically embed scanned pages
 * as raw JPEG streams (SOI marker 0xFFD8FF ... EOI marker 0xFFD9).
 */
export function extractJpegsFromPdf(pdfBuffer, maxImages = 3) {
  const images = [];
  let startIndex = 0;

  while (
    images.length < maxImages &&
    (startIndex = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), startIndex)) !== -1
  ) {
    const endIndex = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), startIndex);
    if (endIndex !== -1) {
      const imgBuf = pdfBuffer.subarray(startIndex, endIndex + 2);
      // Filter out tiny embedded icons / thumbnails (< 5KB)
      if (imgBuf.length > 5 * 1024) {
        images.push(imgBuf);
      }
      startIndex = endIndex + 2;
    } else {
      break;
    }
  }

  return images;
}

export class TextExtractionService {
  /**
   * Normalize extracted raw text:
   * - Unicode normalization (NFKC)
   * - Normalize line endings to \n
   * - Collapse excessive blank lines (> 2 newlines -> 2 newlines)
   * - Trim trailing/leading whitespace per line
   * - Preserve document meaning without hallucinating or rewriting uncertain words
   */
  static normalizeText(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF\u0000]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\t ]+/g, ' ')
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Assess extraction quality using multi-signal heuristics:
   * - Usable character count (alphanumerics)
   * - Meaningful word count (words with length >= 2)
   * - Alphabetic proportion (alphabetic chars / total non-whitespace)
   * - Noise ratio (punctuation & symbols / total non-whitespace)
   * - Quality score (0.0 to 1.0)
   */
  static assessQuality(text, ocrConfidence = null) {
    const normalized = this.normalizeText(text);
    if (!normalized || normalized.length === 0) {
      return {
        usableCharCount: 0,
        meaningfulWordCount: 0,
        alphaRatio: 0,
        noiseRatio: 1.0,
        isSufficient: false,
        isUsable: false,
        qualityScore: 0.0,
        ocrConfidence
      };
    }

    const nonWhitespaceChars = normalized.replace(/\s/g, '');
    const totalChars = nonWhitespaceChars.length;
    const alphaCount = (normalized.match(/[a-zA-Z]/g) || []).length;
    const numericCount = (normalized.match(/[0-9]/g) || []).length;
    const alphanumericCount = alphaCount + numericCount;

    // Meaningful words: sequences of 2 or more alphabetic characters
    const meaningfulWords = (normalized.match(/\b[a-zA-Z]{2,}\b/g) || []);
    const meaningfulWordCount = meaningfulWords.length;

    const alphaRatio = totalChars > 0 ? alphaCount / totalChars : 0;
    const noiseCount = totalChars - alphanumericCount;
    const noiseRatio = totalChars > 0 ? noiseCount / totalChars : 0;

    // Quality score calculation
    let qualityScore = 0.5 * Math.min(1.0, meaningfulWordCount / 20) + 0.3 * alphaRatio + 0.2 * (1.0 - Math.min(1.0, noiseRatio));

    if (ocrConfidence !== null && typeof ocrConfidence === 'number') {
      const normOcrConf = Math.min(1.0, Math.max(0.0, ocrConfidence / 100));
      qualityScore = 0.7 * qualityScore + 0.3 * normOcrConf;
    }

    // A certificate text is considered sufficient if it has at least 30 alphanumeric chars,
    // at least 5 meaningful words, and has at least 40% alphabetic content.
    const isSufficient = alphanumericCount >= 30 && meaningfulWordCount >= 5 && alphaRatio >= 0.40;

    return {
      usableCharCount: alphanumericCount,
      meaningfulWordCount,
      alphaRatio: parseFloat(alphaRatio.toFixed(3)),
      noiseRatio: parseFloat(noiseRatio.toFixed(3)),
      isSufficient,
      isUsable: isSufficient,
      qualityScore: parseFloat(qualityScore.toFixed(3)),
      ocrConfidence
    };
  }

  /**
   * Extract text from an image buffer using Tesseract OCR
   * @param {Buffer|Object} bufferOrObj
   * @param {Object} [options={}]
   * @returns {Promise<{ text: string, confidence: number|null, pagesProcessed: number }>}
   */
  static async extractImageTextWithOCR(bufferOrObj, options = {}) {
    let imageBuffer = bufferOrObj;
    let opts = options;
    if (bufferOrObj && !Buffer.isBuffer(bufferOrObj) && bufferOrObj.buffer) {
      imageBuffer = bufferOrObj.buffer;
      opts = { ...bufferOrObj, ...options };
    }

    if (opts.mockOcrResult !== undefined) {
      return {
        text: opts.mockOcrResult.text || '',
        confidence: opts.mockOcrResult.confidence || 90,
        pagesProcessed: 1
      };
    }

    try {
      const worker = await getOcrWorker();
      const ret = await worker.recognize(imageBuffer);
      const text = ret?.data?.text || '';
      const confidence = typeof ret?.data?.confidence === 'number' ? ret.data.confidence : null;

      return {
        text,
        confidence,
        pagesProcessed: 1
      };
    } catch (err) {
      logger.error(`Tesseract OCR error: ${err.message}`);
      throw new Error(`OCR execution failed: ${err.message}`);
    }
  }

  /**
   * Extract text from embedded digital streams in a PDF
   */
  static async extractEmbeddedPdfText(pdfBuffer, options = {}) {
    if (options.mockPdfResult !== undefined) {
      return options.mockPdfResult;
    }

    const data = await pdfParse(pdfBuffer, {
      max: options.maxPages || 5
    });

    const rawText = data?.text || '';
    const numPages = data?.numpages || 1;

    return {
      text: rawText,
      numPages
    };
  }

  /**
   * Comprehensive text extraction orchestrator:
   * 1. If text PDF: uses embedded digital text without unnecessary OCR
   * 2. If scanned PDF: attempts embedded text -> falls back to embedded JPEG OCR -> multimodal vision fallback
   * 3. If Image (PNG/JPG): uses Tesseract OCR
   * 4. Assesses extraction quality and separates technical failure from weak evidence
   */
  static async extract({ buffer, mimeType = '', filename = '', options = {} }) {
    const startTime = Date.now();
    const warnings = [];

    // 1. Safety check
    if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
      return {
        success: false,
        sourceType: null,
        errorCode: REASON_CODES.TEXT_EXTRACTION_FAILED,
        errorMessage: 'The provided document buffer is empty or invalid.',
        text: '',
        confidence: null,
        pagesProcessed: 0,
        quality: this.assessQuality(''),
        warnings: ['Empty buffer supplied.']
      };
    }

    const isPdf =
      mimeType.toLowerCase() === 'application/pdf' ||
      mimeType.toLowerCase() === 'application/x-pdf' ||
      filename.toLowerCase().endsWith('.pdf');

    const isImage =
      mimeType.startsWith('image/') ||
      /\.(png|jpe?g)$/i.test(filename);

    try {
      // ─────────────────────────────────────────────────────────────
      // Path A: PDF Document Handling
      // ─────────────────────────────────────────────────────────────
      if (isPdf) {
        let pdfResult = null;
        try {
          pdfResult = await this.extractEmbeddedPdfText(buffer, options);
        } catch (pdfErr) {
          warnings.push(`Embedded PDF text parse error: ${pdfErr.message}. Attempting image extraction.`);
        }

        const rawEmbeddedText = pdfResult?.text || '';
        const normalizedEmbedded = this.normalizeText(rawEmbeddedText);
        const embeddedQuality = this.assessQuality(normalizedEmbedded, 100);

        // B1: If embedded text is sufficient, USE IT IMMEDIATELY (Do NOT OCR unnecessarily!)
        if (embeddedQuality.isSufficient) {
          return {
            success: true,
            sourceType: EXTRACTION_SOURCES.EMBEDDED_PDF_TEXT,
            text: normalizedEmbedded,
            confidence: 1.0,
            pagesProcessed: pdfResult?.numPages || 1,
            quality: embeddedQuality,
            warnings,
            latencyMs: Date.now() - startTime
          };
        }

        // B2: Scanned PDF handling — embedded text was insufficient or empty
        warnings.push('PDF contains insufficient embedded text. Attempting scanned page OCR.');

        const embeddedImages = extractJpegsFromPdf(buffer, options.maxOcrImages || 2);
        if (embeddedImages.length > 0) {
          try {
            const ocrOutputs = [];
            let totalOcrConfidence = 0;
            let ocrRuns = 0;

            for (const imgBuf of embeddedImages) {
              const ocrRes = await this.extractImageTextWithOCR(imgBuf, options);
              if (ocrRes.text && ocrRes.text.trim()) {
                ocrOutputs.push(ocrRes.text);
                if (ocrRes.confidence !== null) {
                  totalOcrConfidence += ocrRes.confidence;
                  ocrRuns++;
                }
              }
            }

            const combinedOcrText = this.normalizeText(ocrOutputs.join('\n\n'));
            const avgConf = ocrRuns > 0 ? Math.round(totalOcrConfidence / ocrRuns) : null;
            const scannedQuality = this.assessQuality(combinedOcrText, avgConf);

            if (scannedQuality.isSufficient || combinedOcrText.length > 20) {
              return {
                success: true,
                sourceType: EXTRACTION_SOURCES.OCR_SCANNED_PDF,
                text: combinedOcrText,
                confidence: avgConf,
                pagesProcessed: embeddedImages.length,
                quality: scannedQuality,
                warnings,
                latencyMs: Date.now() - startTime
              };
            }
          } catch (ocrErr) {
            warnings.push(`Scanned PDF OCR attempt failed: ${ocrErr.message}`);
          }
        }

        // Controlled Vision Fallback for PDFs where neither embedded text nor embedded JPEG OCR succeeded
        return {
          success: true,
          sourceType: EXTRACTION_SOURCES.VISION_FALLBACK,
          text: normalizedEmbedded, // provide any partial text available
          confidence: null,
          pagesProcessed: pdfResult?.numPages || 1,
          quality: embeddedQuality,
          warnings: [...warnings, 'No usable embedded text or OCR text. Flagged for controlled multimodal vision interpretation.'],
          latencyMs: Date.now() - startTime
        };
      }

      // ─────────────────────────────────────────────────────────────
      // Path B: Image Document Handling (JPG, JPEG, PNG)
      // ─────────────────────────────────────────────────────────────
      if (isImage) {
        try {
          const ocrRes = await this.extractImageTextWithOCR(buffer, options);
          const normalizedOcr = this.normalizeText(ocrRes.text);
          const quality = this.assessQuality(normalizedOcr, ocrRes.confidence);

          return {
            success: true,
            sourceType: EXTRACTION_SOURCES.OCR_IMAGE,
            text: normalizedOcr,
            confidence: ocrRes.confidence,
            pagesProcessed: 1,
            quality,
            warnings,
            latencyMs: Date.now() - startTime
          };
        } catch (ocrErr) {
          // Technical failure during OCR
          logger.error(`Image OCR technical failure: ${ocrErr.message}`);
          return {
            success: false,
            sourceType: EXTRACTION_SOURCES.OCR_IMAGE,
            errorCode: REASON_CODES.TEXT_EXTRACTION_FAILED,
            errorMessage: `OCR processing error: ${ocrErr.message}`,
            text: '',
            confidence: null,
            pagesProcessed: 0,
            quality: this.assessQuality(''),
            warnings: [ocrErr.message],
            latencyMs: Date.now() - startTime
          };
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Path C: Unknown / Unsupported Document Type
      // ─────────────────────────────────────────────────────────────
      return {
        success: false,
        sourceType: null,
        errorCode: REASON_CODES.TEXT_EXTRACTION_FAILED,
        errorMessage: `Unsupported MIME or file type: ${mimeType || filename}`,
        text: '',
        confidence: null,
        pagesProcessed: 0,
        quality: this.assessQuality(''),
        warnings: ['Unsupported document type.'],
        latencyMs: Date.now() - startTime
      };
    } catch (unexpectedErr) {
      logger.error(`Unexpected text extraction error: ${unexpectedErr.message}`);
      return {
        success: false,
        sourceType: null,
        errorCode: REASON_CODES.TEXT_EXTRACTION_FAILED,
        errorMessage: unexpectedErr.message,
        text: '',
        confidence: null,
        pagesProcessed: 0,
        quality: this.assessQuality(''),
        warnings: [unexpectedErr.message],
        latencyMs: Date.now() - startTime
      };
    }
  }
}
