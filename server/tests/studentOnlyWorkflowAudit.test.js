import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { AnalyticsEngine } from '../src/services/analytics/AnalyticsEngine.js';
import {
  PROCESSING_STATUS,
  EVIDENCE_STATUS,
  RULE_EVALUATION_STATUS,
} from '../src/config/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientSrcDir = path.resolve(__dirname, '../../client/src');

describe('Student-Only Workflow & Review-Terminology Hardening Audit', () => {
  // ============================================================
  // 1. STATIC SCAN OF ALL CLIENT-SIDE FILES FOR FORBIDDEN COPY
  // ============================================================
  describe('Static Scan: Zero Forbidden Review/Approval Copy in Client UI', () => {
    const FORBIDDEN_STUDENT_STRINGS = [
      'Review manually',
      'Pending Review',
      'Awaiting Review',
      'Manual Review',
      'Faculty Review',
      'Faculty Verification',
      'Awaiting Approval',
      'Needs Approval',
      'Verified by Faculty',
      'Please review this certificate',
      'before submitting',
    ];

    function getFilesRecursively(dir, ext = '.jsx') {
      let results = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath, ext));
        } else if (fullPath.endsWith(ext) || fullPath.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    test('All client JSX/JS source files must NOT contain any forbidden manual-review copy', () => {
      assert.ok(fs.existsSync(clientSrcDir), 'client/src directory must exist');
      const clientFiles = getFilesRecursively(clientSrcDir);
      assert.ok(clientFiles.length > 10, 'Expected to scan client source files');

      const violations = [];

      for (const filePath of clientFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(clientSrcDir, filePath);

        for (const forbidden of FORBIDDEN_STUDENT_STRINGS) {
          if (content.includes(forbidden)) {
            violations.push({
              file: relativePath,
              forbidden,
            });
          }
        }
      }

      assert.deepStrictEqual(
        violations,
        [],
        `Found forbidden manual-review copy in client code: ${JSON.stringify(violations, null, 2)}`
      );
    });
  });

  // ============================================================
  // 2. INSUFFICIENT_RULE_DATA BEHAVIOR & MESSAGING
  // ============================================================
  describe('Insufficient Rule Data: Semantics & Outcome Invariants', () => {
    const mockProfile2019 = {
      scheme: '2019',
      entryType: 'regular',
      ruleVersion: '2019-v1',
      requiredPoints: 100,
      maximumPoints: 100,
      admissionYear: 2021,
    };

    test('Valid certificate missing event level produces INSUFFICIENT_RULE_DATA without demoting evidence', () => {
      const validQuizUnknownLevel = {
        certificateTitle: 'Luminis Quiz Certificate',
        activityCategory: 'Professional Self-Initiatives',
        subcategory: 'Tech Quiz',
        eventName: 'Luminis Quiz',
        achievement: 'Participation',
        level: null, // Unknown / unevidenced level
        evidenceStatus: EVIDENCE_STATUS.VALID_EVIDENCE,
        llmConfidence: 0.90,
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: validQuizUnknownLevel,
        existingCertificates: [],
      });

      assert.strictEqual(
        result.processingStatus,
        PROCESSING_STATUS.INSUFFICIENT_RULE_DATA
      );
      assert.strictEqual(
        result.ruleEvaluationStatus,
        RULE_EVALUATION_STATUS.INSUFFICIENT_RULE_DATA
      );
      assert.strictEqual(result.finalPoints, 0);
      assert.ok(
        result.statusReason.includes('event level required'),
        'Reason should inform student that event level is required to calculate points'
      );
      assert.ok(
        !result.statusReason.includes('Review manually'),
        'Reason must never mention manual review'
      );
    });

    test('AnalyticsEngine tracks INSUFFICIENT_RULE_DATA in insufficientEvidence counts', () => {
      const mockCertificates = [
        {
          processingStatus: PROCESSING_STATUS.COUNTED,
          finalPoints: 20,
          activityCategory: 'Professional Self-Initiatives',
        },
        {
          processingStatus: PROCESSING_STATUS.INSUFFICIENT_RULE_DATA,
          finalPoints: 0,
          activityCategory: 'Professional Self-Initiatives',
        },
        {
          processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
          finalPoints: 0,
          activityCategory: 'Professional Self-Initiatives',
        },
      ];

      const analytics = AnalyticsEngine.generateAnalytics({
        studentProfile: mockProfile2019,
        certificates: mockCertificates,
      });

      assert.strictEqual(analytics.overview.statusCounts.counted, 1);
      assert.strictEqual(analytics.overview.statusCounts.insufficientEvidence, 1);
      assert.strictEqual(analytics.overview.statusCounts.notEligible, 1);
      assert.strictEqual(analytics.overview.statusCounts.total, 3);
    });
  });
});
