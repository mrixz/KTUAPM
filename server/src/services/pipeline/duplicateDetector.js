import { Certificate } from '../../models/Certificate.js';
import { normalizeText } from '../../utils/fileHash.js';
import { PROCESSING_STATUS } from '../../config/constants.js';

export class DuplicateDetector {
  /**
   * Check if a certificate is an exact file duplicate or duplicate submission
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.fileHash
   * @param {string} [params.certificateId]
   * @returns {Promise<{ isDuplicate: boolean, duplicateOf: Object|null, reason: string|null }>}
   */
  static async checkExactFileDuplicate({ userId, fileHash, certificateId }) {
    const query = {
      userId,
      fileHash,
      processingStatus: { $ne: PROCESSING_STATUS.FAILED }
    };

    if (certificateId) {
      query._id = { $ne: certificateId };
    }

    const existing = await Certificate.findOne(query);
    if (existing) {
      return {
        isDuplicate: true,
        duplicateOf: existing,
        reason: `Exact identical document already uploaded on ${new Date(existing.uploadedAt).toLocaleDateString()} (Status: ${existing.processingStatus}, Points: ${existing.finalPoints}).`
      };
    }

    return { isDuplicate: false, duplicateOf: null, reason: null };
  }

  /**
   * Check semantic duplication based on certificate number or event attributes
   * @param {Object} params
   * @param {string} params.userId
   * @param {Object} params.facts
   * @param {string} [params.certificateId]
   * @param {boolean} [params.allowRepeats=true]
   * @returns {Promise<{ isSemanticDuplicate: boolean, duplicateOf: Object|null, reason: string|null }>}
   */
  static async checkSemanticDuplicate({ userId, facts, certificateId, allowRepeats = true }) {
    // 1. Check certificate number if available
    if (facts.certificateNumber && facts.certificateNumber.trim().length > 3) {
      const query = {
        userId,
        certificateNumber: facts.certificateNumber.trim(),
        processingStatus: PROCESSING_STATUS.COUNTED
      };
      if (certificateId) query._id = { $ne: certificateId };

      const existingCertNum = await Certificate.findOne(query);
      if (existingCertNum) {
        return {
          isSemanticDuplicate: true,
          duplicateOf: existingCertNum,
          reason: `Certificate number "${facts.certificateNumber}" has already been claimed for points.`
        };
      }
    }

    // 2. Check identical event name + category + date if repeat is not allowed
    if (!allowRepeats && facts.eventName && facts.activityCategory) {
      const existingCerts = await Certificate.find({
        userId,
        activityCategory: facts.activityCategory,
        processingStatus: PROCESSING_STATUS.COUNTED
      });

      const normEvent = normalizeText(facts.eventName);
      for (const cert of existingCerts) {
        if (cert._id.toString() === (certificateId || '').toString()) continue;
        if (cert.eventName && normalizeText(cert.eventName) === normEvent) {
          return {
            isSemanticDuplicate: true,
            duplicateOf: cert,
            reason: `Repeated participation for event "${facts.eventName}" is not permitted under this rule.`
          };
        }
      }
    }

    return { isSemanticDuplicate: false, duplicateOf: null, reason: null };
  }
}
