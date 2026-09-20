import { EvaluationHarness } from '../server/src/services/evaluation/EvaluationHarness.js';
import { connectDB, disconnectDB } from '../server/src/config/db.js';

console.log('===============================================================');
console.log('🧪 KTU ACTIVITY POINTS PLATFORM - 500+ BENCHMARK EVALUATOR');
console.log('===============================================================\n');

async function run() {
  try {
    await connectDB();
    const count = process.env.BENCHMARK_COUNT ? parseInt(process.env.BENCHMARK_COUNT, 10) : 520;
    const report = await EvaluationHarness.runBenchmark({ count });

    console.log('\n===============================================================');
    console.log('🎯 BENCHMARK RESULTS SUMMARY');
    console.log('===============================================================');
    console.log(`Total Certificates Evaluated: ${report.totalCertificates}`);
    console.log(`Automation Rate Achieved:     ${report.automationRate}% (Goal: >= 90%)`);
    console.log(`P95 Latency:                  ${report.latencyStats.p95Ms} ms (Goal: < 10,000ms)`);
    console.log(`Mean Latency:                 ${report.latencyStats.meanMs} ms`);
    console.log(`AI Classification Accuracy:   ${report.classificationMetrics.accuracyPercent}%`);
    console.log('===============================================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  }
}

run();
