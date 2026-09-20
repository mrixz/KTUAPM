import { ProcessingTelemetry } from '../../models/ProcessingTelemetry.js';
import { logger } from '../../utils/logger.js';

export class TelemetryService {
  /**
   * Record a processing telemetry entry
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  static async record(data) {
    try {
      const telemetry = await ProcessingTelemetry.create(data);
      return telemetry;
    } catch (err) {
      logger.error(`Failed to record telemetry: ${err.message}`);
      return null;
    }
  }

  /**
   * Calculate aggregate metrics across all or specific user's telemetry records
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
        stageBreakdown: { textExtraction: 0, llm: 0, ruleEngine: 0, validation: 0 }
      };
    }

    const total = records.length;
    const automatedCount = records.filter(
      (r) => r.processingStatus === 'COUNTED' && !r.requiredReview
    ).length;
    const automationRate = Number(((automatedCount / total) * 100).toFixed(2));

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
      }
    };
  }
}
