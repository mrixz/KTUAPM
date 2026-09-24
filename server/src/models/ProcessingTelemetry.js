import mongoose from 'mongoose';

const processingTelemetrySchema = new mongoose.Schema(
  {
    // Request-scoped identifier for cross-log tracing.
    // Exposed as a short support reference ID on unexpected failures (safe to share with students).
    processingId: {
      type: String,
      default: null,
      index: true
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    durationMs: {
      type: Number,
      default: 0
    },
    textExtractionMs: {
      type: Number,
      default: 0
    },
    llmLatencyMs: {
      type: Number,
      default: 0
    },
    validationMs: {
      type: Number,
      default: 0
    },
    duplicateCheckMs: {
      type: Number,
      default: 0
    },
    ruleEngineMs: {
      type: Number,
      default: 0
    },
    databaseMs: {
      type: Number,
      default: 0
    },
    llmConfidence: {
      type: Number,
      default: 0
    },
    processingStatus: {
      type: String,
      required: true
    },
    // Structured diagnostic fields for metrics aggregation
    evidenceStatus: {
      type: String,
      default: null
    },
    extractionSource: {
      type: String,
      default: null
    },
    ocrUsed: {
      type: Boolean,
      default: false
    },
    fileType: {
      type: String,
      default: null
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    },
    pipelineVersion: {
      type: String,
      default: null
    },
    requiredReview: {
      type: Boolean,
      default: false
    },
    failureReason: {
      type: String,
      default: null
    },
    failureCode: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for time-based metrics queries
processingTelemetrySchema.index({ createdAt: -1 });
processingTelemetrySchema.index({ processingStatus: 1, createdAt: -1 });

export const ProcessingTelemetry = mongoose.model('ProcessingTelemetry', processingTelemetrySchema);
