import crypto from 'crypto';
import mongoose from 'mongoose';
import { ProcessingTelemetry } from '../../models/ProcessingTelemetry.js';
import { logger } from '../../utils/logger.js';

/**
 * Generate a short, URL-safe processing ID for cross-log tracing.
 * The first 8 hex chars of a random 16-byte value are safe to expose to students
 * as a support reference (not guessable, not sequential, no PII).
 */
export function generateProcessingId() {
  return crypto.randomBytes(8).toString('hex');
}

export class TelemetryService {
  /**
   * Record a processing telemetry entry.
   * Safe fields only — never logs JWT, passwords, API secrets, full certificate text, or MongoDB URI.
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  static async record(data) {
    try {
      // In offline/unit tests where DB is not connected, skip recording without buffering timeout
      if (mongoose.connection?.readyState !== 1) {
        return null;
      }
      const telemetry = await ProcessingTelemetry.create(data);
      return telemetry;
    } catch (err) {
      logger.error(`Failed to record telemetry: ${err.message}`);
      return null;
    }
  }

  /**
   * Calculate aggregate metrics across all or specific user's telemetry records.
   * Returns counts for upload success/failure, OCR failures, Gemini failures,
   * evidence invalids, duplicates, caps, and timing percentiles.
   * @param {Object} [filter={}]
   * @returns {Promise<Object>}
   */
  static async getAggregateMetrics(filter = {}) {
    const records = await ProcessingTelemetry.find(filter).lean();
    if (!records || records.length === 0) {
      return {
        totalProcessed: 0,
        automationRate: 0,
        latencies: { mean: 0, median: 0, p95: 0, min: 0, max: 0 },
        stageBreakdown: { textExtraction: 0, llm: 0, ruleEngine: 0, validation: 0 },
        statusBreakdown: {}
      };
    }

    const total = records.length;

    // Status breakdown
    const statusBreakdown = {};
    for (const r of records) {
      const s = r.processingStatus || 'UNKNOWN';
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    // Evidence breakdown
    const evidenceBreakdown = {};
    for (const r of records) {
      const e = r.evidenceStatus || 'UNKNOWN';
      evidenceBreakdown[e] = (evidenceBreakdown[e] || 0) + 1;
    }

    const automatedCount = records.filter(
      (r) => r.processingStatus === 'COUNTED' && !r.requiredReview
    ).length;
    const automationRate = Number(((automatedCount / total) * 100).toFixed(2));

    const ocrCount = records.filter((r) => r.ocrUsed).length;
    const failedCount = records.filter((r) => r.processingStatus === 'FAILED').length;
    const duplicateCount = statusBreakdown['DUPLICATE'] || 0;
    const countedCount = statusBreakdown['COUNTED'] || 0;
    const notEligibleCount = statusBreakdown['NOT_ELIGIBLE'] || 0;
    const insufficientEvidenceCount = statusBreakdown['INSUFFICIENT_EVIDENCE'] || 0;
    const insufficientRuleDataCount = statusBreakdown['INSUFFICIENT_RULE_DATA'] || 0;

    const durations = records.map((r) => r.durationMs || 0).sort((a, b) => a - b);
    const mean = Number((durations.reduce((a, b) => a + b, 0) / total).toFixed(2));
    const median = durations[Math.floor(total / 2)] || 0;
    const p95 = durations[Math.floor(total * 0.95)] || durations[durations.length - 1] || 0;
    const min = durations[0] || 0;
    const max = durations[durations.length - 1] || 0;

    const avgExtract = Number(
      (records.reduce((sum, r) => sum + (r.textExtractionMs || 0), 0) / total).toFixed(2)
    );
    const avgLlm = Number(
      (records.reduce((sum, r) => sum + (r.llmLatencyMs || 0), 0) / total).toFixed(2)
    );
    const avgRule = Number(
      (records.reduce((sum, r) => sum + (r.ruleEngineMs || 0), 0) / total).toFixed(2)
    );
    const avgVal = Number(
      (records.reduce((sum, r) => sum + (r.validationMs || 0), 0) / total).toFixed(2)
    );

    return {
      totalProcessed: total,
      automatedCount,
      needsReviewCount: total - automatedCount,
      automationRate,
      countedCount,
      duplicateCount,
      notEligibleCount,
      insufficientEvidenceCount,
      insufficientRuleDataCount,
      failedCount,
      ocrCount,
      successRate: Number(((countedCount / total) * 100).toFixed(2)),
      latencies: {
        mean,
        median,
        p95,
        min,
        max
      },
      stageBreakdown: {
        textExtraction: avgExtract,
        llm: avgLlm,
        ruleEngine: avgRule,
        validation: avgVal
      },
      statusBreakdown,
      evidenceBreakdown
    };
  }
}
