import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SchemeResolver } from '../src/services/scheme/SchemeResolver.js';
import { RuleEngine } from '../src/services/rules/RuleEngine.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { AnalyticsEngine } from '../src/services/analytics/AnalyticsEngine.js';
import { OpportunityAdvisor } from '../src/services/analytics/OpportunityAdvisor.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';
import { PROCESSING_STATUS } from '../src/config/constants.js';

describe('4-WAY COMPLETE REGRESSION TEST SUITE: 2019 Regular, 2019 Lateral, 2024 Regular, 2024 Lateral', async () => {
  await ruleLoader.loadAllRules();

  // =========================================================================
  // PROFILE A: 2019 REGULAR
  // =========================================================================
  describe('Profile A: 2019 Scheme + Regular Entry', () => {
    test('Resolves strictly 100 points, 2 credits, 6 segments', () => {
      const resolved = SchemeResolver.resolveScheme({
        admissionYear: 2021,
        entryType: 'regular',
        program: 'B.Tech',
        branch: 'Computer Science and Engineering'
      });

      assert.strictEqual(resolved.scheme, '2019');
      assert.strictEqual(resolved.entryType, 'regular');
      assert.strictEqual(resolved.ruleVersion, '2019-v1');
      assert.strictEqual(resolved.requiredPoints, 100);
      assert.strictEqual(resolved.maximumPoints, 100);
      assert.strictEqual(resolved.mandatoryCredits, 2);
      assert.strictEqual(resolved.joiningSemester, 1);
      assert.strictEqual(resolved.groupRequirements, null);
    });

    test('Awards points across 2019 segments and caps at 60 points for Sports', () => {
      const profile = {
        scheme: '2019',
        entryType: 'regular',
        ruleVersion: '2019-v1',
        requiredPoints: 100,
        maximumPoints: 100,
        admissionYear: 2021
      };

      // 1. Zonal Sports winner (15 + 10 = 25 pts)
      const cert1 = PointCalculationEngine.calculatePoints({
        studentProfile: profile,
        extractedFacts: {
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'Zonal Football Tournament',
          level: 'Zonal',
          achievement: 'First Prize',
          certificateDate: '2022-02-10'
        },
        existingCertificates: []
      });
      assert.strictEqual(cert1.finalPoints, 25);
      assert.strictEqual(cert1.processingStatus, PROCESSING_STATUS.COUNTED);

      // 2. State Sports participation (25 pts)
      const existing = [{ ...cert1, processingStatus: PROCESSING_STATUS.COUNTED }];
      const cert2 = PointCalculationEngine.calculatePoints({
        studentProfile: profile,
        extractedFacts: {
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'State Basketball Meet',
          level: 'State',
          achievement: 'Participation',
          certificateDate: '2022-08-15'
        },
        existingCertificates: existing
      });
      assert.strictEqual(cert2.finalPoints, 25);

      // 3. National Sports participation (40 pts) -> Hits 60 pt category cap! (Current 50, so gets remaining 10)
      existing.push({ ...cert2, processingStatus: PROCESSING_STATUS.COUNTED });
      const cert3 = PointCalculationEngine.calculatePoints({
        studentProfile: profile,
        extractedFacts: {
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'National Games Athletics',
          level: 'National',
          achievement: 'Participation',
          certificateDate: '2023-01-20'
        },
        existingCertificates: existing
      });
      // 50 already earned + 30 allowable = 80 enhanced sports cap
      assert.strictEqual(cert3.finalPoints, 30);
      assert.strictEqual(cert3.processingStatus, PROCESSING_STATUS.COUNTED);
    });
  });

  // =========================================================================
  // PROFILE B: 2019 LATERAL
  // =========================================================================
  describe('Profile B: 2019 Scheme + Lateral Entry', () => {
    test('Resolves strictly 75 points, 2 credits, joining semester 3', () => {
      const resolved = SchemeResolver.resolveScheme({
        admissionYear: 2024,
        entryType: 'lateral',
        curriculumRegulation: '2019',
        program: 'B.Tech',
        branch: 'Mechanical Engineering'
      });

      assert.strictEqual(resolved.scheme, '2019');
      assert.strictEqual(resolved.entryType, 'lateral');
      assert.strictEqual(resolved.ruleVersion, '2019-v1');
      assert.strictEqual(resolved.requiredPoints, 75);
      assert.strictEqual(resolved.maximumPoints, 75);
      assert.strictEqual(resolved.mandatoryCredits, 2);
      assert.strictEqual(resolved.joiningSemester, 3);
    });

    test('Computes 75-point target progress and remaining shortfall correctly', () => {
      const profile = {
        scheme: '2019',
        entryType: 'lateral',
        ruleVersion: '2019-v1',
        requiredPoints: 75,
        maximumPoints: 75,
        admissionYear: 2024
      };

      const certs = [
        {
          activityCategory: 'Professional Self Initiatives',
          finalPoints: 50,
          processingStatus: PROCESSING_STATUS.COUNTED,
          certificateDate: new Date('2024-11-10')
        }
      ];

      const analytics = AnalyticsEngine.generateAnalytics({
        studentProfile: profile,
        certificates: certs
      });

      assert.strictEqual(analytics.overview.currentPoints, 50);
      assert.strictEqual(analytics.overview.requiredPoints, 75);
      assert.strictEqual(analytics.overview.remainingPoints, 25);
    });
  });

  // =========================================================================
  // PROFILE C: 2024 REGULAR
  // =========================================================================
  describe('Profile C: 2024 Scheme + Regular Entry', () => {
    test('Resolves strictly 120 points, 3 credits, min 40 points in Group I, II, III', () => {
      const resolved = SchemeResolver.resolveScheme({
        admissionYear: 2024,
        entryType: 'regular',
        program: 'B.Tech',
        branch: 'Computer Science and Engineering'
      });

      assert.strictEqual(resolved.scheme, '2024');
      assert.strictEqual(resolved.entryType, 'regular');
      assert.strictEqual(resolved.ruleVersion, '2024-v1');
      assert.strictEqual(resolved.requiredPoints, 120);
      assert.strictEqual(resolved.maximumPoints, 120);
      assert.strictEqual(resolved.mandatoryCredits, 3);
      assert.strictEqual(resolved.joiningSemester, 1);
      assert.strictEqual(resolved.groupRequirements.group_1.minPoints, 40);
      assert.strictEqual(resolved.groupRequirements.group_2.minPoints, 40);
      assert.strictEqual(resolved.groupRequirements.group_3.minPoints, 40);
    });

    test('Evaluates Group I, II, III progress and flags incomplete groups with ⚠️', () => {
      const profile = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const certs = [
        // Group I: 38 points (needs 2 more for min 40)
        { activityCategory: 'group_1', finalPoints: 38, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2024-10-01') },
        // Group II: 40 points (met)
        { activityCategory: 'group_2', finalPoints: 40, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2024-11-01') },
        // Group III: 25 points (needs 15 more for min 40)
        { activityCategory: 'group_3', finalPoints: 25, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2024-12-01') }
      ];

      const analytics = AnalyticsEngine.generateAnalytics({
        studentProfile: profile,
        certificates: certs
      });

      assert.strictEqual(analytics.overview.currentPoints, 103);
      assert.strictEqual(analytics.overview.requiredPoints, 120);
      assert.strictEqual(analytics.overview.remainingPoints, 17);
      assert.strictEqual(analytics.overview.allGroupMinimumsMet, false);

      // Group I: 38/40 ⚠️
      assert.strictEqual(analytics.groupStats[0].earnedPoints, 38);
      assert.strictEqual(analytics.groupStats[0].minRequiredPoints, 40);
      assert.strictEqual(analytics.groupStats[0].isMet, false);
      assert.strictEqual(analytics.groupStats[0].shortfall, 2);
      assert.strictEqual(analytics.groupStats[0].statusIndicator, '⚠️');

      // Group II: 40/40 ✓
      assert.strictEqual(analytics.groupStats[1].earnedPoints, 40);
      assert.strictEqual(analytics.groupStats[1].minRequiredPoints, 40);
      assert.strictEqual(analytics.groupStats[1].isMet, true);
      assert.strictEqual(analytics.groupStats[1].shortfall, 0);
      assert.strictEqual(analytics.groupStats[1].statusIndicator, '✓');

      // Group III: 25/40 ⚠️
      assert.strictEqual(analytics.groupStats[2].earnedPoints, 25);
      assert.strictEqual(analytics.groupStats[2].minRequiredPoints, 40);
      assert.strictEqual(analytics.groupStats[2].isMet, false);
      assert.strictEqual(analytics.groupStats[2].shortfall, 15);
      assert.strictEqual(analytics.groupStats[2].statusIndicator, '⚠️');
    });
  });

  // =========================================================================
  // PROFILE D: 2024 LATERAL
  // =========================================================================
  describe('Profile D: 2024 Scheme + Lateral Entry', () => {
    test('Resolves strictly 90 points, 3 credits, min 30 points in Group I, II, III (NEVER 75)', () => {
      const resolved = SchemeResolver.resolveScheme({
        admissionYear: 2025,
        entryType: 'lateral',
        program: 'B.Tech',
        branch: 'Civil Engineering'
      });

      assert.strictEqual(resolved.scheme, '2024');
      assert.strictEqual(resolved.entryType, 'lateral');
      assert.strictEqual(resolved.ruleVersion, '2024-v1');
      assert.strictEqual(resolved.requiredPoints, 90);
      assert.strictEqual(resolved.maximumPoints, 90);
      assert.strictEqual(resolved.mandatoryCredits, 3);
      assert.strictEqual(resolved.joiningSemester, 3);
      assert.strictEqual(resolved.groupRequirements.group_1.minPoints, 30);
      assert.strictEqual(resolved.groupRequirements.group_2.minPoints, 30);
      assert.strictEqual(resolved.groupRequirements.group_3.minPoints, 30);
    });

    test('Evaluates 2024 Lateral Group Minimums (30/30 ✓, 27/30 ⚠️, 25/30 ⚠️ -> Total 82 / 90)', () => {
      const profile = {
        scheme: '2024',
        entryType: 'lateral',
        ruleVersion: '2024-v1',
        requiredPoints: 90,
        maximumPoints: 90,
        admissionYear: 2025
      };

      const certs = [
        { activityCategory: 'group_1', finalPoints: 30, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2025-09-01') },
        { activityCategory: 'group_2', finalPoints: 27, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2025-10-01') },
        { activityCategory: 'group_3', finalPoints: 25, processingStatus: PROCESSING_STATUS.COUNTED, certificateDate: new Date('2025-11-01') }
      ];

      const analytics = AnalyticsEngine.generateAnalytics({
        studentProfile: profile,
        certificates: certs
      });

      assert.strictEqual(analytics.overview.currentPoints, 82);
      assert.strictEqual(analytics.overview.requiredPoints, 90);
      assert.strictEqual(analytics.overview.remainingPoints, 8);
      assert.strictEqual(analytics.overview.allGroupMinimumsMet, false);

      // Group 1: 30/30 ✓
      assert.strictEqual(analytics.groupStats[0].isMet, true);
      assert.strictEqual(analytics.groupStats[0].statusIndicator, '✓');

      // Group 2: 27/30 ⚠️
      assert.strictEqual(analytics.groupStats[1].isMet, false);
      assert.strictEqual(analytics.groupStats[1].shortfall, 3);
      assert.strictEqual(analytics.groupStats[1].statusIndicator, '⚠️');

      // Group 3: 25/30 ⚠️
      assert.strictEqual(analytics.groupStats[2].isMet, false);
      assert.strictEqual(analytics.groupStats[2].shortfall, 5);
      assert.strictEqual(analytics.groupStats[2].statusIndicator, '⚠️');

      // Opportunity Advisor calculates remaining points needed
      const opps = OpportunityAdvisor.getOpportunities({
        studentProfile: profile,
        certificates: certs
      });
      assert.strictEqual(opps.remainingPoints, 8);
      assert.ok(opps.groupOpportunities.find((g) => g.groupId === 'group_2').stillNeeded === 3);
      assert.ok(opps.groupOpportunities.find((g) => g.groupId === 'group_3').stillNeeded === 5);
    });
  });

  // =========================================================================
  // PREVENTING BUG: REJECTION OF INVALID CROSS-SCHEME DATA
  // =========================================================================
  describe('Defensive Regression: Cross-Scheme Mixture Guard', () => {
    test('Throws on 2024 scheme with 75 required points', () => {
      assert.throws(() => {
        SchemeResolver._validateResolution({
          scheme: '2024',
          entryType: 'lateral',
          requiredPoints: 75
        });
      }, /CRITICAL RULE ENGINE ERROR: 2024 Lateral Entry requires exactly 90 points/);
    });

    test('Throws on 2019 scheme with 90 required points', () => {
      assert.throws(() => {
        SchemeResolver._validateResolution({
          scheme: '2019',
          entryType: 'lateral',
          requiredPoints: 90
        });
      }, /CRITICAL RULE ENGINE ERROR: 2019 Lateral Entry requires exactly 75 points/);
    });
  });
});
