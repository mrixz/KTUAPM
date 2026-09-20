import { Certificate } from '../../models/Certificate.js';
import { StudentProfile } from '../../models/StudentProfile.js';
import { certificateStorage } from '../storage/CertificateStorageService.js';
import { TextExtractor } from './textExtractor.js';
import { GeminiCertificateAnalyzer } from '../ai/GeminiCertificateAnalyzer.js';
import { DuplicateDetector } from './duplicateDetector.js';
import { PointCalculationEngine } from '../points/PointCalculationEngine.js';
import { TelemetryService } from '../telemetry/TelemetryService.js';
import { PROCESSING_STATUS, CONFIDENCE_THRESHOLDS } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';

export class CertificateProcessingPipeline {
  constructor(analyzer = new GeminiCertificateAnalyzer()) {
    this.analyzer = analyzer;
  }

  /**
   * Process a single certificate document through the entire automated pipeline
   * @param {string|Object} certificateIdOrDoc
   * @param {Object} [options={}]
   * @returns {Promise<Object>} Processed certificate document
   */
  async process(certificateIdOrDoc, options = {}) {
    const startTime = Date.now();
    let textExtractionMs = 0;
    let llmLatencyMs = 0;
    let validationMs = 0;
    let duplicateCheckMs = 0;
    let ruleEngineMs = 0;
    let databaseMs = 0;

    // 1. Fetch / Resolve Certificate Mongoose Document
    let certificate = null;
    if (certificateIdOrDoc && typeof certificateIdOrDoc.save === 'function') {
      certificate = certificateIdOrDoc;
    } else {
      const certId =
        certificateIdOrDoc?._id || certificateIdOrDoc?.id || certificateIdOrDoc;
      if (certId) {
        certificate = await Certificate.findById(certId);
      }
    }

    if (!certificate) {
      throw new Error('Certificate document not found for processing.');
    }

    const userId = certificate.userId;

    try {
      // 2. Fetch Student Profile
      const studentProfile = await StudentProfile.findOne({ userId });
      if (!studentProfile) {
        throw new Error('Student profile not found. Please complete registration profile first.');
      }

      // 3. Exact Duplicate Detection Check
      const dupStart = Date.now();
      const exactDupCheck = await DuplicateDetector.checkExactFileDuplicate({
        userId,
        fileHash: certificate.fileHash,
        certificateId: certificate._id
      });
      duplicateCheckMs += Date.now() - dupStart;

      if (exactDupCheck.isDuplicate) {
        certificate.processingStatus = PROCESSING_STATUS.DUPLICATE;
        certificate.statusReason = exactDupCheck.reason;
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.processedAt = new Date();
        await certificate.save();

        await TelemetryService.record({
          certificateId: certificate._id,
          userId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          duplicateCheckMs,
          processingStatus: PROCESSING_STATUS.DUPLICATE,
          requiredReview: true,
          failureReason: 'Exact duplicate document detected.'
        });

        return certificate;
      }

      // 4. Retrieve Document Buffer from Storage
      const buffer = await certificateStorage.getCertificate(certificate.storageKey);
      if (!buffer) {
        throw new Error('Certificate file could not be read from storage provider.');
      }

      // 5. Document Text Extraction (PDF text or Image prep)
      const extractStart = Date.now();
      const extractedContent = await TextExtractor.extract(buffer, certificate.mimeType);
      textExtractionMs = Date.now() - extractStart;

      // 6. AI Document Understanding (Gemini 2.5 Flash)
      const aiResult = await this.analyzer.analyze({
        text: extractedContent.text,
        buffer,
        mimeType: certificate.mimeType,
        filename: certificate.originalFilename
      });

      llmLatencyMs = aiResult.llmLatencyMs || 0;

      // 7. Schema & Output Validation
      const valStart = Date.now();
      const confidence = typeof aiResult.confidence === 'number' ? aiResult.confidence : 0.8;
      validationMs = Date.now() - valStart;

      // 8. Semantic Duplicate Check (e.g. cert number)
      const semDupStart = Date.now();
      const semanticDupCheck = await DuplicateDetector.checkSemanticDuplicate({
        userId,
        facts: aiResult,
        certificateId: certificate._id,
        allowRepeats: true
      });
      duplicateCheckMs += Date.now() - semDupStart;

      if (semanticDupCheck.isSemanticDuplicate) {
        certificate.processingStatus = PROCESSING_STATUS.DUPLICATE;
        certificate.statusReason = semanticDupCheck.reason;
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.llmConfidence = confidence;
        certificate.extractedData = aiResult;
        certificate.processedAt = new Date();
        await certificate.save();

        await TelemetryService.record({
          certificateId: certificate._id,
          userId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          textExtractionMs,
          llmLatencyMs,
          validationMs,
          duplicateCheckMs,
          llmConfidence: confidence,
          processingStatus: PROCESSING_STATUS.DUPLICATE,
          requiredReview: true,
          failureReason: 'Semantic duplicate certificate number / event.'
        });

        return certificate;
      }

      // 9. Fetch Existing COUNTED Certificates for Category Cap Tracking
      const existingCerts = await Certificate.find({
        userId,
        _id: { $ne: certificate._id },
        processingStatus: PROCESSING_STATUS.COUNTED
      }).lean();

      // 10. Deterministic Point Calculation & Trace
      const ruleStart = Date.now();
      const calculationResult = PointCalculationEngine.calculatePoints({
        studentProfile,
        extractedFacts: {
          ...aiResult,
          llmConfidence: confidence
        },
        existingCertificates: existingCerts
      });
      ruleEngineMs = Date.now() - ruleStart;

      // 11. Populate Certificate Record with Extracted Facts & Rule Output
      certificate.certificateTitle = aiResult.certificateTitle || certificate.originalFilename;
      certificate.activityCategory = calculationResult.categoryName || aiResult.activityCategory;
      certificate.subcategory = aiResult.subcategory || 'General';
      certificate.eventName = aiResult.eventName || 'Activity';
      certificate.organizer = aiResult.organizer || null;
      certificate.achievement = aiResult.achievement || 'Participation';
      certificate.level = aiResult.level || 'College / Institution';
      certificate.position = aiResult.position || null;
      certificate.duration = aiResult.duration || null;
      certificate.certificateDate = aiResult.date ? new Date(aiResult.date) : null;
      certificate.participantName = aiResult.participantName || null;
      certificate.certificateNumber = aiResult.certificateNumber || null;
      certificate.relevantText = aiResult.relevantText || extractedContent.text?.slice(0, 300);

      certificate.llmModel = aiResult.llmModel || 'gemini-2.5-flash';
      certificate.llmConfidence = confidence;
      certificate.extractedData = aiResult;

      certificate.scheme = studentProfile.scheme;
      certificate.entryType = studentProfile.entryType;
      certificate.ruleVersion = studentProfile.ruleVersion;
      certificate.matchedRuleId = calculationResult.matchedRuleId;

      certificate.basePoints = calculationResult.basePoints;
      certificate.categoryAdjustment = calculationResult.categoryAdjustment;
      certificate.overallAdjustment = calculationResult.overallAdjustment;
      certificate.finalPoints = calculationResult.finalPoints;
      certificate.calculationTrace = calculationResult.calculationTrace;

      certificate.processingStatus = calculationResult.processingStatus;
      certificate.statusReason = calculationResult.statusReason;
      certificate.processedAt = new Date();

      // 12. Save Certificate
      const dbStart = Date.now();
      await certificate.save();
      databaseMs = Date.now() - dbStart;

      // 13. Record Telemetry
      const totalDuration = Date.now() - startTime;
      await TelemetryService.record({
        certificateId: certificate._id,
        userId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: totalDuration,
        textExtractionMs,
        llmLatencyMs,
        validationMs,
        duplicateCheckMs,
        ruleEngineMs,
        databaseMs,
        llmConfidence: confidence,
        processingStatus: certificate.processingStatus,
        requiredReview: certificate.processingStatus !== PROCESSING_STATUS.COUNTED,
        failureReason: certificate.processingStatus !== PROCESSING_STATUS.COUNTED ? certificate.statusReason : null
      });

      logger.info(
        `Pipeline complete for Cert ${certificate._id}: Status=${certificate.processingStatus}, FinalPts=${certificate.finalPoints}, Duration=${totalDuration}ms`
      );

      return certificate;
    } catch (err) {
      const certId = certificate?._id || certificateIdOrDoc?._id || certificateIdOrDoc;
      logger.error(`Pipeline failure for cert ${certId}: ${err.message}`);

      // Safely persist failed state to MongoDB with zero points
      if (certId) {
        try {
          await Certificate.findByIdAndUpdate(certId, {
            $set: {
              processingStatus: PROCESSING_STATUS.FAILED,
              statusReason: err.message,
              processedAt: new Date(),
              basePoints: 0,
              categoryAdjustment: 0,
              overallAdjustment: 0,
              finalPoints: 0
            }
          });
        } catch (dbErr) {
          logger.error(`Failed to update certificate error state in DB: ${dbErr.message}`);
        }
      }

      if (certificate && typeof certificate === 'object') {
        certificate.processingStatus = PROCESSING_STATUS.FAILED;
        certificate.statusReason = err.message;
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.processedAt = new Date();
      }

      await TelemetryService.record({
        certificateId: certId,
        userId: userId || certificate?.userId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        processingStatus: PROCESSING_STATUS.FAILED,
        requiredReview: true,
        failureReason: err.message
      }).catch(() => {});

      return certificate || { _id: certId, processingStatus: PROCESSING_STATUS.FAILED, statusReason: err.message, finalPoints: 0 };
    }

  }
}

export const certificatePipeline = new CertificateProcessingPipeline();
