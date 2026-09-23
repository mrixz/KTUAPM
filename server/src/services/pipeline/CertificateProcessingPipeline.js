import { Certificate } from '../../models/Certificate.js';
import { StudentProfile } from '../../models/StudentProfile.js';
import { User } from '../../models/User.js';
import { certificateStorage } from '../storage/CertificateStorageService.js';
import { TextExtractionService } from '../ocr/TextExtractionService.js';
import { EvidenceValidator } from './EvidenceValidator.js';
import { StudentAttribution } from './StudentAttribution.js';
import { GeminiCertificateAnalyzer } from '../ai/GeminiCertificateAnalyzer.js';
import { DuplicateDetector } from './duplicateDetector.js';
import { PointCalculationEngine } from '../points/PointCalculationEngine.js';
import { TelemetryService } from '../telemetry/TelemetryService.js';
import {
  PROCESSING_STATUS,
  EVIDENCE_STATUS,
  REASON_CODES,
  EXTRACTION_SOURCES
} from '../../config/constants.js';
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
      // 2. Fetch Student Profile and User
      const [studentProfile, user] = await Promise.all([
        StudentProfile.findOne({ userId }),
        User.findById(userId)
      ]);

      if (!studentProfile) {
        throw new Error('Student profile not found. Please complete registration profile first.');
      }

      // 3. Exact Duplicate Detection Check (SHA-256 hash lookup)
      const dupStart = Date.now();
      const exactDupCheck = await DuplicateDetector.checkExactFileDuplicate({
        userId,
        fileHash: certificate.fileHash,
        certificateId: certificate._id
      });
      duplicateCheckMs += Date.now() - dupStart;

      if (exactDupCheck.isDuplicate) {
        certificate.processingStatus = PROCESSING_STATUS.DUPLICATE;
        certificate.evidenceStatus = EVIDENCE_STATUS.INVALID_EVIDENCE;
        certificate.evidenceReasonCode = 'EXACT_DUPLICATE';
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

      // 5. OCR-First Text Extraction (PDF embedded text, scanned PDF OCR, or image OCR)
      const extractStart = Date.now();
      const extractionResult = await TextExtractionService.extract({
        buffer,
        mimeType: certificate.mimeType,
        filename: certificate.originalFilename,
        options
      });
      textExtractionMs = Date.now() - extractStart;

      certificate.extractionSource = extractionResult.sourceType || EXTRACTION_SOURCES.EMBEDDED_PDF_TEXT;
      certificate.extractionQuality = extractionResult.quality || null;

      // 6. Handle Technical Extraction Failure (separate from evidence insufficiency)
      if (!extractionResult.success) {
        certificate.processingStatus = PROCESSING_STATUS.FAILED;
        certificate.evidenceStatus = null;
        certificate.evidenceReasonCode = extractionResult.errorCode || REASON_CODES.TEXT_EXTRACTION_FAILED;
        certificate.statusReason = `Text extraction failed: ${extractionResult.errorMessage || 'Unable to extract document text.'}`;
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
          textExtractionMs,
          processingStatus: PROCESSING_STATUS.FAILED,
          requiredReview: true,
          failureReason: certificate.statusReason
        });

        // PointCalculationEngine MUST NOT RUN
        return certificate;
      }

      // 7. Evidence Validation (Determine what the document proves: VALID, INVALID, INSUFFICIENT)
      const valStart = Date.now();
      const evidenceValidation = EvidenceValidator.evaluateEvidence({
        text: extractionResult.text,
        filename: certificate.originalFilename,
        mimeType: certificate.mimeType,
        quality: extractionResult.quality
      });
      validationMs = Date.now() - valStart;

      certificate.evidenceStatus = evidenceValidation.evidenceStatus;
      certificate.evidenceReasonCode = evidenceValidation.reasonCode;
      certificate.documentPurpose = evidenceValidation.documentPurpose;
      certificate.evidenceChecks = evidenceValidation.checks;

      // 8. If Evidence is INVALID or INSUFFICIENT, STOP IMMEDIATELY (Point Engine MUST NOT RUN)
      if (evidenceValidation.evidenceStatus !== EVIDENCE_STATUS.VALID_EVIDENCE) {
        const isInvalid = evidenceValidation.evidenceStatus === EVIDENCE_STATUS.INVALID_EVIDENCE;
        certificate.processingStatus = isInvalid ? PROCESSING_STATUS.NOT_ELIGIBLE : PROCESSING_STATUS.INSUFFICIENT_EVIDENCE;
        certificate.statusReason = evidenceValidation.reason;
        certificate.documentType = evidenceValidation.documentPurpose;
        certificate.activityCategory = 'unclassified';
        certificate.subcategory = 'None';
        certificate.eventName = 'Non-Eligible Submission';
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.llmConfidence = 0;
        certificate.processedAt = new Date();
        await certificate.save();

        await TelemetryService.record({
          certificateId: certificate._id,
          userId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          textExtractionMs,
          validationMs,
          llmConfidence: 0,
          processingStatus: certificate.processingStatus,
          requiredReview: false,
          failureReason: evidenceValidation.reason
        });

        logger.info(
          `Document rejected at evidence validation: ${evidenceValidation.reasonCode} (${evidenceValidation.evidenceStatus}) for Cert ${certificate._id}`
        );

        // PointCalculationEngine is NEVER INVOKED
        return certificate;
      }

      // 9. Structured Document Understanding via Gemini (using OCR text as primary evidence)
      const allowVision = extractionResult.sourceType === EXTRACTION_SOURCES.VISION_FALLBACK;
      const aiResult = await this.analyzer.analyze({
        text: extractionResult.text,
        buffer,
        mimeType: certificate.mimeType,
        filename: certificate.originalFilename,
        allowVisionFallback: allowVision
      });

      llmLatencyMs = aiResult.llmLatencyMs || 0;

      // Double-check AI document understanding agreement
      if (aiResult.isCertificate === false) {
        certificate.processingStatus = PROCESSING_STATUS.NOT_ELIGIBLE;
        certificate.evidenceStatus = EVIDENCE_STATUS.INVALID_EVIDENCE;
        certificate.evidenceReasonCode = REASON_CODES.PROMOTIONAL_MATERIAL;
        certificate.documentPurpose = aiResult.documentType || 'non_certificate';
        certificate.statusReason = aiResult.rejectionReason || 'Document identified as non-certificate material.';
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.processedAt = new Date();
        await certificate.save();

        // PointCalculationEngine MUST NOT RUN
        return certificate;
      }

      // 10. Student Attribution Check (Verify certificate recipient against student profile)
      const attribution = StudentAttribution.verifyAttribution({
        extractedName: aiResult.participantName,
        studentName: user?.name,
        registerNumber: studentProfile.registerNumber,
        documentText: extractionResult.text
      });

      certificate.studentAttribution = attribution;

      // Handle student mismatch: certificate issued to a different student
      if (attribution.status === 'CLEAR_MISMATCH') {
        certificate.processingStatus = PROCESSING_STATUS.NOT_ELIGIBLE;
        certificate.evidenceStatus = EVIDENCE_STATUS.INVALID_EVIDENCE;
        certificate.evidenceReasonCode = REASON_CODES.STUDENT_MISMATCH;
        certificate.statusReason = attribution.reason;
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.processedAt = new Date();
        await certificate.save();

        logger.warn(`Student attribution mismatch for Cert ${certificate._id}: ${attribution.reason}`);
        // PointCalculationEngine MUST NOT RUN
        return certificate;
      }

      // Handle template or unresolvable recipient name
      if (attribution.status === 'TEMPLATE') {
        certificate.processingStatus = PROCESSING_STATUS.NOT_ELIGIBLE;
        certificate.evidenceStatus = EVIDENCE_STATUS.INVALID_EVIDENCE;
        certificate.evidenceReasonCode = REASON_CODES.CERTIFICATE_TEMPLATE;
        certificate.statusReason = attribution.reason;
        certificate.basePoints = 0;
        certificate.categoryAdjustment = 0;
        certificate.overallAdjustment = 0;
        certificate.finalPoints = 0;
        certificate.processedAt = new Date();
        await certificate.save();

        // PointCalculationEngine MUST NOT RUN
        return certificate;
      }

      // 11. Semantic Duplicate Check (Certificate Number / Event Name)
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
        certificate.llmConfidence = aiResult.confidence || 0.8;
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
          llmConfidence: aiResult.confidence || 0.8,
          processingStatus: PROCESSING_STATUS.DUPLICATE,
          requiredReview: true,
          failureReason: 'Semantic duplicate certificate number / event.'
        });

        return certificate;
      }

      // 12. Fetch Existing COUNTED Certificates for Category Cap Tracking
      const existingCerts = await Certificate.find({
        userId,
        _id: { $ne: certificate._id },
        processingStatus: PROCESSING_STATUS.COUNTED
      }).lean();

      // 13. DETERMINISTIC POINT CALCULATION (Authoritative Rule Engine Boundary)
      // Gemini NEVER calculates or assigns points. Only official KTU rulesets do.
      const ruleStart = Date.now();
      const calculationResult = PointCalculationEngine.calculatePoints({
        studentProfile,
        extractedFacts: {
          ...aiResult,
          llmConfidence: aiResult.confidence || 0.85
        },
        existingCertificates: existingCerts
      });
      ruleEngineMs = Date.now() - ruleStart;

      // 14. Populate Certificate Record with Facts & Deterministic Rule Output
      certificate.certificateTitle = aiResult.certificateTitle || certificate.originalFilename;
      certificate.documentType = 'certificate';
      certificate.activityCategory = calculationResult.categoryName || aiResult.activityCategory || 'unclassified';
      certificate.subcategory = aiResult.subcategory || 'General';
      certificate.eventName = aiResult.eventName || null;
      certificate.organizer = aiResult.organizer || null;
      certificate.achievement = aiResult.achievement || 'Participation';
      certificate.level = aiResult.level || null;
      certificate.position = aiResult.position || null;
      certificate.duration = aiResult.duration || null;
      certificate.certificateDate = aiResult.date ? new Date(aiResult.date) : null;
      certificate.participantName = aiResult.participantName || user?.name || null;
      certificate.certificateNumber = aiResult.certificateNumber || null;
      certificate.relevantText = aiResult.relevantText || extractionResult.text?.slice(0, 300);

      certificate.llmModel = aiResult.llmModel || 'gemini-2.5-flash';
      certificate.llmConfidence = aiResult.confidence || 0.85;
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
      certificate.ruleEvaluationStatus = calculationResult.ruleEvaluationStatus || null;
      certificate.statusReason = calculationResult.statusReason;
      certificate.processedAt = new Date();

      // 15. Save Certificate
      const dbStart = Date.now();
      await certificate.save();
      databaseMs = Date.now() - dbStart;

      // 16. Record Telemetry
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
        llmConfidence: certificate.llmConfidence,
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
