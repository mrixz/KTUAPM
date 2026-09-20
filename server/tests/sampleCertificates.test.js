import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { SchemeResolver } from '../src/services/scheme/SchemeResolver.js';
import { RuleEngine } from '../src/services/rules/RuleEngine.js';
import { PROCESSING_STATUS } from '../src/config/constants.js';

describe('Sample Certificates & Real-World Decision Audit', () => {
  // 1. Case A: 7-day Data Science & Machine Learning Internship
  describe('Case A: 7-day Data Science & Machine Learning Internship', () => {
    const internship7DaysFacts = {
      certificateTitle: 'Certificate of Internship in Data Science & Machine Learning',
      activityCategory: 'Industrial Training / Internship',
      subcategory: 'Industrial Training',
      eventName: 'Data Science & ML Internship',
      organizer: 'TechCorp Solutions',
      achievement: 'Completion',
      duration: '7 Days',
      certificateDate: '2023-07-15',
      llmConfidence: 0.92
    };

    it('under 2019 Scheme: eligible under Sl. 14 (min 5 full days) -> awards 20 points, COUNTED', () => {
      const student2019 = {
        scheme: '2019',
        entryType: 'regular',
        ruleVersion: '2019-v1',
        requiredPoints: 100,
        maximumPoints: 100,
        admissionYear: 2020
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019,
        extractedFacts: internship7DaysFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 20);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-INTERN-01');
    });

    it('under 2024 Scheme: INELIGIBLE under Subactivity 2.20 (requires min 2 weeks / 10 working days) -> 0 points, NOT_ELIGIBLE', () => {
      const student2024 = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024,
        extractedFacts: {
          ...internship7DaysFacts,
          certificateDate: '2024-07-15'
        },
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.finalPoints, 0);
      assert.ok(result.statusReason.includes('minimum of 2 weeks or 10 working days'));
    });

    it('under 2024 Scheme: 2-week / 14-day internship IS eligible -> awards 10 points, COUNTED', () => {
      const student2024 = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const internship14DaysFacts = {
        ...internship7DaysFacts,
        duration: '2 Weeks (14 Days)',
        certificateDate: '2024-11-20'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024,
        extractedFacts: internship14DaysFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 10);
      assert.strictEqual(result.matchedRuleId, '2024-G2-2.20');
    });
  });

  // 2. Case B: 1-day Cyber Security & Ethical Hacking Workshop
  describe('Case B: 1-day Cyber Security & Ethical Hacking Workshop', () => {
    it('with verified NIT/IIT host under 2024 Subactivity 2.5 -> awards 5 points, COUNTED', () => {
      const workshopFacts = {
        certificateTitle: 'Workshop on Cyber Security and Ethical Hacking',
        activityCategory: 'GROUP-II',
        subcategory: 'Conferences & Workshops',
        eventName: 'National Workshop on Cyber Security',
        organizer: 'National Institute of Technology (NIT) Calicut',
        achievement: 'Participation',
        duration: '1 Day',
        level: 'National Events (Level 4)',
        certificateDate: '2024-10-15',
        llmConfidence: 0.90
      };

      const student2024 = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024,
        extractedFacts: workshopFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 5);
      assert.strictEqual(result.matchedRuleId, '2024-G2-2.5');
    });

    it('with low confidence / unverified host lacking required evidence -> INSUFFICIENT_EVIDENCE', () => {
      const vagueWorkshopFacts = {
        certificateTitle: 'Cyber Security Training',
        activityCategory: 'Unknown',
        subcategory: 'Workshop',
        eventName: 'Cyber Fest Talk',
        organizer: 'Private Club',
        achievement: 'Attendance',
        duration: '1 Day',
        certificateDate: '2024-10-15',
        llmConfidence: 0.55 // below threshold
      };

      const student2024 = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024,
        extractedFacts: vagueWorkshopFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.INSUFFICIENT_EVIDENCE);
      assert.strictEqual(result.finalPoints, 0);
    });
  });

  // 3. Case C: National-level XPLORE / EV Technologies Participation Certificate
  describe('Case C: National-level XPLORE / EV Technologies Certificate', () => {
    it('under 2019 Tech Fest (Level IV National) -> awards 40 points, COUNTED', () => {
      const techFestFacts = {
        certificateTitle: 'Certificate of Participation in XPLORE EV Technologies',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'Tech Fest',
        eventName: 'XPLORE EV Technologies National Fest',
        organizer: 'KTU Approved Engineering College',
        achievement: 'Participation',
        level: 'National Events',
        certificateDate: '2022-03-20',
        llmConfidence: 0.88
      };

      const student2019 = {
        scheme: '2019',
        entryType: 'regular',
        ruleVersion: '2019-v1',
        requiredPoints: 100,
        maximumPoints: 100,
        admissionYear: 2021
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019,
        extractedFacts: techFestFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 40);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-TECHFEST-01');
    });

    it('under 2024 Tech-Fest (Level 4 National Participation) -> awards 20 points, COUNTED', () => {
      const techFestFacts = {
        certificateTitle: 'Certificate of Participation in XPLORE EV Technologies',
        activityCategory: 'GROUP-II',
        subcategory: 'Tech-Fest',
        eventName: 'XPLORE EV Technologies National Fest',
        organizer: 'KTU Approved Technical Fest',
        achievement: 'Participation',
        level: 'National Events (Level 4)',
        certificateDate: '2024-11-10',
        llmConfidence: 0.90
      };

      const student2024 = {
        scheme: '2024',
        entryType: 'regular',
        ruleVersion: '2024-v1',
        requiredPoints: 120,
        maximumPoints: 120,
        admissionYear: 2024
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024,
        extractedFacts: techFestFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 20);
      assert.strictEqual(result.matchedRuleId, '2024-G2-2.1');
    });
  });

  // 4. Pre-programme Certificate Ineligibility (General Rule vi)
  describe('General Rule vi: Pre-programme Certificate Rejection', () => {
    it('rejects certificate dated before admission year with NOT_ELIGIBLE', () => {
      const preProgFacts = {
        certificateTitle: 'School Level Sports Certificate',
        activityCategory: 'Sports & Games',
        subcategory: 'Sports',
        eventName: 'District Athletic Meet',
        achievement: 'First Prize',
        level: 'Zonal Events',
        certificateDate: '2018-05-10',
        llmConfidence: 0.95
      };

      const student2019 = {
        scheme: '2019',
        entryType: 'regular',
        ruleVersion: '2019-v1',
        requiredPoints: 100,
        maximumPoints: 100,
        admissionYear: 2020
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019,
        extractedFacts: preProgFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.finalPoints, 0);
      assert.ok(result.statusReason.includes('precedes admission year'));
    });
  });

  // 5. Four Scheme & Entry Type Profiles Validation
  describe('Four Scheme & Entry Type Profiles (Strict Isolation)', () => {
    it('2019 Regular -> 100 required points', () => {
      const res = SchemeResolver.resolveAcademicContext({
        scheme: '2019',
        entryType: 'regular'
      });
      assert.strictEqual(res.requiredPoints, 100);
      assert.strictEqual(res.scheme, '2019');
      assert.strictEqual(res.entryType, 'regular');
    });

    it('2019 Lateral -> 75 required points', () => {
      const res = SchemeResolver.resolveAcademicContext({
        scheme: '2019',
        entryType: 'lateral'
      });
      assert.strictEqual(res.requiredPoints, 75);
      assert.strictEqual(res.scheme, '2019');
      assert.strictEqual(res.entryType, 'lateral');
    });

    it('2024 Regular -> 120 required points, 40 min per group', () => {
      const res = SchemeResolver.resolveAcademicContext({
        scheme: '2024',
        entryType: 'regular'
      });
      assert.strictEqual(res.requiredPoints, 120);
      assert.strictEqual(res.scheme, '2024');
      assert.strictEqual(res.entryType, 'regular');
      assert.strictEqual(res.groupRequirements.group_1.minPoints, 40);
      assert.strictEqual(res.groupRequirements.group_2.minPoints, 40);
      assert.strictEqual(res.groupRequirements.group_3.minPoints, 40);
    });

    it('2024 Lateral -> 90 required points, 30 min per group (NEVER 75)', () => {
      const res = SchemeResolver.resolveAcademicContext({
        scheme: '2024',
        entryType: 'lateral'
      });
      assert.strictEqual(res.requiredPoints, 90);
      assert.notStrictEqual(res.requiredPoints, 75, 'CRITICAL: 2024 Lateral must NEVER have 75 points');
      assert.strictEqual(res.scheme, '2024');
      assert.strictEqual(res.entryType, 'lateral');
      assert.strictEqual(res.groupRequirements.group_1.minPoints, 30);
      assert.strictEqual(res.groupRequirements.group_2.minPoints, 30);
      assert.strictEqual(res.groupRequirements.group_3.minPoints, 30);
    });
  });
});
