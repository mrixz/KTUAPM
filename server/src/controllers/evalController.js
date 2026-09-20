import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { EvaluationHarness } from '../services/evaluation/EvaluationHarness.js';
import { EvaluationRun } from '../models/EvaluationRun.js';

export const getLatestEvaluation = async (req, res, next) => {
  try {
    const reportJsonPath = path.resolve(process.cwd(), 'evaluation/reports/evaluation-report.json');
    const fallbackPath = path.resolve(process.cwd(), '../evaluation/reports/evaluation-report.json');

    const targetPath = fsSync.existsSync(reportJsonPath)
      ? reportJsonPath
      : fsSync.existsSync(fallbackPath)
      ? fallbackPath
      : null;

    if (targetPath) {
      const data = await fs.readFile(targetPath, 'utf-8');
      return res.status(200).json({
        success: true,
        report: JSON.parse(data)
      });
    }

    const latestRun = await EvaluationRun.findOne().sort({ completedAt: -1 }).lean();
    if (latestRun) {
      return res.status(200).json({
        success: true,
        report: latestRun
      });
    }

    res.status(404).json({
      success: false,
      message: 'No benchmark evaluation run has been executed yet.'
    });
  } catch (err) {
    next(err);
  }
};

export const runEvaluation = async (req, res, next) => {
  try {
    const count = req.body.count ? parseInt(req.body.count, 10) : 520;
    const report = await EvaluationHarness.runBenchmark({ count });

    res.status(200).json({
      success: true,
      message: `Benchmark evaluation completed on ${report.totalCertificates} documents.`,
      report
    });
  } catch (err) {
    next(err);
  }
};
