import { TextExtractionService } from '../ocr/TextExtractionService.js';

export { TextExtractionService };

/**
 * TextExtractor (Backwards-compatible bridge)
 * Delegates to the unified TextExtractionService.
 */
export class TextExtractor {
  static async extract(buffer, mimeType, filename = '', options = {}) {
    const res = await TextExtractionService.extract({ buffer, mimeType, filename, options });
    return {
      text: res.text,
      numPages: res.pagesProcessed || 1,
      isImageOnly: !res.quality?.isSufficient,
      extractionResult: res
    };
  }
}
