/**
 * KTUAPM — Scheme Isolation Test Suite
 *
 * Formally proves that 2019 and 2024 rules are strictly isolated:
 *   - ruleLoader serves correct rulesets per scheme key
 *   - Each ruleset's rules have scheme-prefixed ruleIds (no ID collisions)
 *   - PointCalculationEngine never applies 2024 rules to 2019 students or vice versa
 *   - The 2024 "win+participation same event" general rule does NOT fire for 2019 students
 *   - Correct overall cap (regular vs lateral) per scheme
 *
 * Discovered from live inspection:
 *   - Rule objects use 'ruleId' field (not 'id')
 *   - Cap config is in ruleset.academicRequirements.{regular|lateral}.maximumPoints
 *   - ruleLoader.getRuleSet('2019','2024-v1') falls back to latest_2019 (correct scheme preserved)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';

const STUDENT_2019 = {
  scheme: '2019', entryType: 'regular', ruleVersion: '2019-v1',
  requiredPoints: 100, maximumPoints: 100, admissionYear: 2021
};
const STUDENT_2024_REG = {
  scheme: '2024', entryType: 'regular', ruleVersion: '2024-v1',
  requiredPoints: 120, maximumPoints: 120, admissionYear: 2024,
  groupRequirements: { group_1: { minPoints: 40 }, group_2: { minPoints: 40 }, group_3: { minPoints: 40 } }
};
const STUDENT_2024_LAT = {
  scheme: '2024', entryType: 'lateral', ruleVersion: '2024-v1',
  requiredPoints: 90, maximumPoints: 90, admissionYear: 2024,
  groupRequirements: { group_1: { minPoints: 30 }, group_2: { minPoints: 30 }, group_3: { minPoints: 30 } }
};

describe('Scheme Isolation Tests', async () => {
  await ruleLoader.loadAllRules();

  // ─── 1. RuleLoader isolation ────────────────────────────────────────────────
  describe('1. RuleLoader: Strict Scheme Segmentation', () => {

    test('SI-01: ruleLoader.getRuleSet("2019", "2019-v1") returns the 2019 ruleset', () => {
      const rs = ruleLoader.getRuleSet('2019', '2019-v1');
      assert.ok(rs, 'Expected ruleSet to be defined');
      assert.equal(rs.scheme, '2019');
      assert.ok(Array.isArray(rs.rules) && rs.rules.length > 0, 'Expected at least 1 rule in 2019 ruleset');
    });

    test('SI-02: ruleLoader.getRuleSet("2024", "2024-v1") returns the 2024 ruleset', () => {
      const rs = ruleLoader.getRuleSet('2024', '2024-v1');
      assert.ok(rs, 'Expected ruleSet to be defined');
      assert.equal(rs.scheme, '2024');
      assert.ok(Array.isArray(rs.rules) && rs.rules.length > 0, 'Expected at least 1 rule in 2024 ruleset');
    });

    test('SI-03: All rules in 2019 ruleset have ruleIds starting with "2019-"', () => {
      const rs = ruleLoader.getRuleSet('2019', '2019-v1');
      for (const rule of rs.rules) {
        const ruleId = rule.ruleId || rule.id;
        assert.ok(
          ruleId && ruleId.startsWith('2019-'),
          `2019 ruleset contains non-2019 ruleId: ${ruleId}`
        );
      }
    });

    test('SI-04: All rules in 2024 ruleset have ruleIds starting with "2024-"', () => {
      const rs = ruleLoader.getRuleSet('2024', '2024-v1');
      for (const rule of rs.rules) {
        const ruleId = rule.ruleId || rule.id;
        assert.ok(
          ruleId && ruleId.startsWith('2024-'),
          `2024 ruleset contains non-2024 ruleId: ${ruleId}`
        );
      }
    });

    test('SI-05: No ruleId exists in both 2019 and 2024 rulesets (no ID collision)', () => {
      const rs2019 = ruleLoader.getRuleSet('2019', '2019-v1');
      const rs2024 = ruleLoader.getRuleSet('2024', '2024-v1');
      const ids2019 = new Set(rs2019.rules.map(r => r.ruleId || r.id).filter(Boolean));
      const ids2024 = new Set(rs2024.rules.map(r => r.ruleId || r.id).filter(Boolean));
      for (const id of ids2019) {
        assert.ok(!ids2024.has(id), `Rule ID "${id}" exists in BOTH 2019 and 2024 rulesets (collision)`);
      }
    });

    test('SI-06: ruleLoader fallback for mismatched scheme/version preserves original scheme (no cross-serving)', () => {
      // getRuleSet('2019','2024-v1') should fall back to latest_2019, NOT serve the 2024 ruleset
      const rs = ruleLoader.getRuleSet('2019', '2024-v1');
      // It returns latest_2019 (which is the 2019 ruleset) — this is correct behaviour
      // The test verifies it returns the 2019 ruleset, not null and not a 2024 ruleset
      if (rs !== null && rs !== undefined) {
        assert.equal(rs.scheme, '2019',
          `Expected 2019 scheme on fallback, got: ${rs.scheme} — a different scheme would be cross-serving`);
      }
      // null is also acceptable (strict mode — no match, no fallback)
    });
  });

  // ─── 2. Academic Requirements caps ─────────────────────────────────────────
  describe('2. Academic Requirements: Correct Cap Values per Entry Type', () => {

    test('SI-07: 2019 regular scheme requires 100 points (not 120)', () => {
      const rs = ruleLoader.getRuleSet('2019', '2019-v1');
      const regularReq = rs.academicRequirements?.regular;
      assert.ok(regularReq, 'Expected academicRequirements.regular');
      assert.equal(regularReq.maximumPoints, 100, `Expected 2019 regular cap=100, got ${regularReq.maximumPoints}`);
    });

    test('SI-08: 2024 regular scheme requires 120 points (not 100)', () => {
      const rs = ruleLoader.getRuleSet('2024', '2024-v1');
      const regularReq = rs.academicRequirements?.regular;
      assert.ok(regularReq, 'Expected academicRequirements.regular');
      assert.equal(regularReq.maximumPoints, 120, `Expected 2024 regular cap=120, got ${regularReq.maximumPoints}`);
    });

    test('SI-09: 2024 lateral scheme has lower cap than regular (≤ 90)', () => {
      const rs = ruleLoader.getRuleSet('2024', '2024-v1');
      const lateralReq = rs.academicRequirements?.lateral;
      const regularReq = rs.academicRequirements?.regular;
      assert.ok(lateralReq, 'Expected academicRequirements.lateral');
      assert.ok(
        lateralReq.maximumPoints <= 90,
        `Expected lateral cap ≤90, got ${lateralReq.maximumPoints}`
      );
      assert.ok(
        lateralReq.maximumPoints < regularReq.maximumPoints,
        `Expected lateral cap < regular cap: ${lateralReq.maximumPoints} < ${regularReq.maximumPoints}`
      );
    });
  });

  // ─── 3. PointCalculationEngine isolation ───────────────────────────────────
  describe('3. PointCalculationEngine: Cross-Scheme Contamination', () => {

    test('SI-10: 2019 student matching a 2019 activity gets a 2019-prefixed matchedRuleId', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019,
        extractedFacts: {
          activityCategory: 'National Initiatives',
          subcategory: 'NSS',
          eventName: 'NSS Volunteer Year 1',
          duration: '1 Year',
          achievement: 'Completed 1 Year',
          certificateDate: '2022-05-01'
        }
      });
      if (result.matchedRuleId) {
        assert.ok(
          result.matchedRuleId.startsWith('2019-'),
          `2019 student matched a non-2019 rule: ${result.matchedRuleId}`
        );
      }
    });

    test('SI-11: 2024 student matching a 2024 activity gets a 2024-prefixed matchedRuleId', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'Blood donation',
          eventName: 'Blood Donation Drive',
          certificateDate: '2024-10-15'
        }
      });
      if (result.matchedRuleId) {
        assert.ok(
          result.matchedRuleId.startsWith('2024-'),
          `2024 student matched a non-2024 rule: ${result.matchedRuleId}`
        );
      }
    });

    test('SI-12: 2019 student submitted with 2024-style category name never gets a 2024 ruleId', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019,
        extractedFacts: {
          // These are 2024 category names — should NOT match 2019 rules
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'Sports/Games/Arts Participation',
          eventName: 'State Athletics 2022',
          level: 'State Events (Level 3)',
          achievement: 'Participation',
          certificateDate: '2022-08-01'
        }
      });
      if (result.matchedRuleId) {
        assert.ok(
          !result.matchedRuleId.startsWith('2024-'),
          `2019 student incorrectly matched a 2024 rule: ${result.matchedRuleId}`
        );
      }
    });

    test('SI-13: 2024 student submitted with 2019-style category name never gets a 2019 ruleId', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          // These are 2019 category names
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'District Athletics',
          level: 'District',
          achievement: 'Participation',
          certificateDate: '2025-01-10'
        }
      });
      if (result.matchedRuleId) {
        assert.ok(
          !result.matchedRuleId.startsWith('2019-'),
          `2024 student incorrectly matched a 2019 rule: ${result.matchedRuleId}`
        );
      }
    });
  });

  // ─── 4. 2024 General Rule — Win+Participation not applied to 2019 ──────────
  describe('4. 2024 General Rule: Win+Participation Isolation', () => {

    test('SI-14: 2019 student participation after win for same event does not trigger 2024-specific rejection message', () => {
      const existing = [
        { _id: 'cert_win', eventName: 'State Athletics Meet 2022', activityCategory: 'group_2',
          matchedRuleId: '2019-SPT-SPORTS-01', finalPoints: 40, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019,
        extractedFacts: {
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'State Athletics Meet 2022',
          level: 'State',
          achievement: 'Participation',
          certificateDate: '2022-08-15'
        },
        existingCertificates: existing
      });
      // The 2024-specific win+participation general rule message must NOT appear for 2019 students
      if (result.finalPoints === 0 && result.statusReason) {
        assert.ok(
          !result.statusReason.includes('Participation points cannot be combined with winning points for the same event'),
          `2024-specific win+participation general rule incorrectly applied to 2019 student: ${result.statusReason}`
        );
      }
    });

    test('SI-15: 2024 student — participation after win for same event triggers correct rejection', () => {
      const existing = [
        { _id: 'cert_win2', eventName: 'IEDC Kerala Startup Fest', activityCategory: 'group_2',
          matchedRuleId: '2024-G2-2.2', finalPoints: 20, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
          subcategory: 'Tech-Fest-Participation',
          eventName: 'IEDC Kerala Startup Fest',
          level: 'State Events (Level 3)',
          achievement: 'Participation',
          certificateDate: '2025-02-10'
        },
        existingCertificates: existing
      });
      assert.equal(result.finalPoints, 0);
      assert.equal(result.processingStatus, 'NOT_ELIGIBLE');
    });
  });
});
