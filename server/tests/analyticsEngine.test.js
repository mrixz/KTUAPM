import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AnalyticsEngine } from '../src/services/analytics/AnalyticsEngine.js';
import { OpportunityAdvisor } from '../src/services/analytics/OpportunityAdvisor.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';

describe('AnalyticsEngine & OpportunityAdvisor Test Suite', async () => {
  await ruleLoader.loadAllRules();

  const studentProfile = {
    scheme: '2019',
    entryType: 'regular',
    ruleVersion: '2019-v1',
    requiredPoints: 100,
    maximumPoints: 100,
    admissionYear: 2021
  };

  const certificates = [
    {
      activityCategory: 'National Initiatives',
      finalPoints: 40,
      processingStatus: 'COUNTED',
      certificateDate: new Date('2022-03-15')
    },
    {
      activityCategory: 'Sports & Games',
      finalPoints: 20,
      processingStatus: 'COUNTED',
      certificateDate: new Date('2022-08-20')
    },
    {
      activityCategory: 'Professional Self-Initiatives',
      finalPoints: 0,
      processingStatus: 'NEEDS_REVIEW',
      certificateDate: new Date('2023-01-10')
    }
  ];

  test('Calculates overall progress metrics correctly', () => {
    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile,
      certificates
    });

    assert.strictEqual(analytics.overview.currentPoints, 60);
    assert.strictEqual(analytics.overview.requiredPoints, 100);
    assert.strictEqual(analytics.overview.remainingPoints, 40);
    assert.strictEqual(analytics.overview.completionPercentage, 60.0);
    assert.strictEqual(analytics.overview.statusCounts.total, 3);
    assert.strictEqual(analytics.overview.statusCounts.counted, 2);
    assert.strictEqual(analytics.overview.statusCounts.needsReview, 1);
  });

  test('Identifies available category capacity and opportunities accurately for 2019', () => {
    const opportunities = OpportunityAdvisor.getOpportunities({
      studentProfile,
      certificates
    });

    assert.strictEqual(opportunities.currentPoints, 60);
    assert.strictEqual(opportunities.remainingPoints, 40);
    
    // Find Professional Self Initiatives category
    const proCat = opportunities.categoryOpportunities.find(
      (c) => c.categoryName === 'Professional Self Initiatives' || c.categoryId === 'professional_self_initiatives'
    );
    assert.ok(proCat);
    assert.strictEqual(proCat.earnedPoints, 0);
    assert.strictEqual(proCat.remainingCapacity, 100);
    assert.strictEqual(proCat.hasCapacity, true);

    // Verify suggested activities are populated from official rules
    assert.ok(opportunities.suggestedActivities.length > 0);
  });

  test('2024 Scheme: Accurately computes Group I, II, III progression and minimum requirements (40 pts/group regular)', () => {
    const student2024Reg = {
      scheme: '2024',
      entryType: 'regular',
      ruleVersion: '2024-v1',
      requiredPoints: 120,
      maximumPoints: 120,
      admissionYear: 2024
    };

    const certs2024 = [
      {
        activityCategory: 'group_1',
        finalPoints: 40,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2024-10-15')
      },
      {
        activityCategory: 'group_2',
        finalPoints: 30,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2024-11-20')
      },
      {
        activityCategory: 'group_3',
        finalPoints: 25,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2025-01-10')
      }
    ];

    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: student2024Reg,
      certificates: certs2024
    });

    assert.strictEqual(analytics.overview.currentPoints, 95);
    assert.strictEqual(analytics.overview.requiredPoints, 120);
    assert.strictEqual(analytics.overview.remainingPoints, 25);
    assert.strictEqual(analytics.overview.allGroupMinimumsMet, false);

    assert.ok(Array.isArray(analytics.groupStats));
    assert.strictEqual(analytics.groupStats.length, 3);

    // Group 1: 40/40 (Met ✓)
    assert.strictEqual(analytics.groupStats[0].earnedPoints, 40);
    assert.strictEqual(analytics.groupStats[0].isMet, true);
    assert.strictEqual(analytics.groupStats[0].statusIndicator, '✓');

    // Group 2: 30/40 (Not Met ⚠️, 10 needed)
    assert.strictEqual(analytics.groupStats[1].earnedPoints, 30);
    assert.strictEqual(analytics.groupStats[1].isMet, false);
    assert.strictEqual(analytics.groupStats[1].shortfall, 10);
    assert.strictEqual(analytics.groupStats[1].statusIndicator, '⚠️');

    // Group 3: 25/40 (Not Met ⚠️, 15 needed)
    assert.strictEqual(analytics.groupStats[2].earnedPoints, 25);
    assert.strictEqual(analytics.groupStats[2].isMet, false);
    assert.strictEqual(analytics.groupStats[2].shortfall, 15);
    assert.strictEqual(analytics.groupStats[2].statusIndicator, '⚠️');
  });

  test('2024 Scheme: Lateral Entry uses 30 pts per group minimum (90 required total)', () => {
    const student2024Lat = {
      scheme: '2024',
      entryType: 'lateral',
      ruleVersion: '2024-v1',
      requiredPoints: 90,
      maximumPoints: 90,
      admissionYear: 2025
    };

    const certs2024 = [
      {
        activityCategory: 'group_1',
        finalPoints: 30,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2025-09-15')
      },
      {
        activityCategory: 'group_2',
        finalPoints: 30,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2025-10-20')
      },
      {
        activityCategory: 'group_3',
        finalPoints: 30,
        processingStatus: 'COUNTED',
        certificateDate: new Date('2025-11-10')
      }
    ];

    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: student2024Lat,
      certificates: certs2024
    });

    assert.strictEqual(analytics.overview.currentPoints, 90);
    assert.strictEqual(analytics.overview.requiredPoints, 90);
    assert.strictEqual(analytics.overview.remainingPoints, 0);
    assert.strictEqual(analytics.overview.allGroupMinimumsMet, true);

    // All 3 groups met for lateral
    assert.strictEqual(analytics.groupStats[0].isMet, true);
    assert.strictEqual(analytics.groupStats[1].isMet, true);
    assert.strictEqual(analytics.groupStats[2].isMet, true);
  });
});
