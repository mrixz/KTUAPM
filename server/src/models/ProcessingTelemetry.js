import mongoose from 'mongoose';

const processingTelemetrySchema = new mongoose.Schema(
  {
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
    requiredReview: {
      type: Boolean,
      default: false
    },
    failureReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const ProcessingTelemetry = mongoose.model('ProcessingTelemetry', processingTelemetrySchema);
