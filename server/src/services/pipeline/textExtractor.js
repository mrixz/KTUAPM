import pdfParse from 'pdf-parse';
import { logger } from '../../utils/logger.js';

export class TextExtractor {
  /**
   * Extract text and metadata from document buffer
   * @param {Buffer} buffer 
   * @param {string} mimeType 
   * @returns {Promise<{ text: string, numPages: number, isImageOnly: boolean }>}
   */
  static async extract(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        const text = (data.text || '').trim();
        return {
          text,
          numPages: data.numpages || 1,
          isImageOnly: text.length < 20
        };
      } catch (err) {
        logger.warn(`PDF parse error: ${err.message}. Treating as scanned/image document.`);
        return {
          text: '',
          numPages: 1,
          isImageOnly: true
        };
      }
    }

    // Images (PNG/JPG)
    return {
      text: '',
      numPages: 1,
      isImageOnly: true
    };
  }
}
