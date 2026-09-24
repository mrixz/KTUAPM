import mongoose from 'mongoose';
import { PROCESSING_STATUS } from '../config/constants.js';

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // File storage attributes
    originalFilename: {
      type: String,
      required: true
    },
    storageKey: {
      type: String,
      required: true
    },
    fileHash: {
      type: String,
      required: true,
      index: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    },

    // AI-extracted structured information
    certificateTitle: {
      type: String,
      default: null
    },
    documentType: {
      type: String,
      default: 'certificate'
    },
    activityCategory: {
      type: String,
      default: null,
      index: true
    },
    subcategory: {
      type: String,
      default: null
    },
    eventName: {
      type: String,
      default: null
    },
    organizer: {
      type: String,
      default: null
    },
    achievement: {
      type: String,
      default: null
    },
    level: {
      type: String,
      default: null
    },
    position: {
      type: String,
      default: null
    },
    duration: {
      type: String,
      default: null
    },
    certificateDate: {
      type: Date,
      default: null
    },
    participantName: {
      type: String,
      default: null
    },
    certificateNumber: {
      type: String,
      default: null,
      index: true
    },
    relevantText: {
      type: String,
      default: null
    },

    // AI Metadata
    llmModel: {
      type: String,
      default: null
    },
    llmConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Processing status
    processingStatus: {
      type: String,
      enum: Object.values(PROCESSING_STATUS),
      default: PROCESSING_STATUS.PROCESSING,
      index: true
    },
    statusReason: {
      type: String,
      default: null
    },

    // Evidence Validation Attributes
    evidenceStatus: {
      type: String,
      enum: ['VALID_EVIDENCE', 'INVALID_EVIDENCE', 'INSUFFICIENT_EVIDENCE', null],
      default: null,
      index: true
    },
    ruleEvaluationStatus: {
      type: String,
      enum: ['ELIGIBLE', 'NOT_ELIGIBLE', 'INSUFFICIENT_RULE_DATA', 'CAP_REACHED', 'DUPLICATE', null],
      default: null,
      index: true
    },
    evidenceReasonCode: {
      type: String,
      default: null
    },
    documentPurpose: {
      type: String,
      default: null
    },
    evidenceChecks: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    extractionSource: {
      type: String,
      enum: ['EMBEDDED_PDF_TEXT', 'OCR_IMAGE', 'OCR_SCANNED_PDF', 'VISION_FALLBACK', 'MANUAL', null],
      default: null
    },
    extractionQuality: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    studentAttribution: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Academic & Rule Context
    scheme: {
      type: String,
      default: null
    },
    entryType: {
      type: String,
      default: null
    },
    ruleVersion: {
      type: String,
      default: null
    },
    matchedRuleId: {
      type: String,
      default: null
    },

    // Deterministic Rule Engine Points
    basePoints: {
      type: Number,
      default: 0
    },
    categoryAdjustment: {
      type: Number,
      default: 0
    },
    overallAdjustment: {
      type: Number,
      default: 0
    },
    finalPoints: {
      type: Number,
      default: 0
    },

    // Calculation trace
    calculationTrace: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    },

    // Pipeline & Rules Versioning (audit trail — not shown to students)
    pipelineVersion: {
      type: String,
      default: null
    },
    rulesVersion: {
      type: String,
      default: null
    },

    // Timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast querying & student ownership filtering
certificateSchema.index({ userId: 1, processingStatus: 1 });
certificateSchema.index({ userId: 1, activityCategory: 1 });
certificateSchema.index({ userId: 1, fileHash: 1 });

export const Certificate = mongoose.model('Certificate', certificateSchema);
