import mongoose from 'mongoose';

const evaluationRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    totalCertificates: {
      type: Number,
      required: true
    },
    automatedCount: {
      type: Number,
      required: true
    },
    needsReviewCount: {
      type: Number,
      required: true
    },
    failedCount: {
      type: Number,
      required: true
    },
    automationRate: {
      type: Number, // Percentage (0 - 100)
      required: true
    },
    latencyStats: {
      meanMs: Number,
      medianMs: Number,
      p95Ms: Number,
      minMs: Number,
      maxMs: Number
    },
    classificationMetrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number
    },
    ruleAccuracyRate: {
      type: Number
    },
    categoryBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    schemeBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const EvaluationRun = mongoose.model('EvaluationRun', evaluationRunSchema);
