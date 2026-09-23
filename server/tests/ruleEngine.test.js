import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RuleEngine } from '../src/services/rules/RuleEngine.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';

describe('Comprehensive RuleEngine & PointCalculationEngine Test Suite', async () => {
  await ruleLoader.loadAllRules();

  const student2019Regular = {
    scheme: '2019',
    entryType: 'regular',
    ruleVersion: '2019-v1',
    requiredPoints: 100,
    maximumPoints: 100,
    admissionYear: 2022
  };

  const student2024Regular = {
    scheme: '2024',
    entryType: 'regular',
    ruleVersion: '2024-v1',
    requiredPoints: 120,
    maximumPoints: 120,
    admissionYear: 2024,
    groupRequirements: {
      group_1: { minPoints: 40 },
      group_2: { minPoints: 40 },
      group_3: { minPoints: 40 }
    }
  };

  const student2024Lateral = {
    scheme: '2024',
    entryType: 'lateral',
    ruleVersion: '2024-v1',
    requiredPoints: 90,
    maximumPoints: 90,
    admissionYear: 2025,
    groupRequirements: {
      group_1: { minPoints: 30 },
      group_2: { minPoints: 30 },
      group_3: { minPoints: 30 }
    }
  };

  // ==========================================
  // 1. 2019 SCHEME TESTS ACROSS ALL 6 SEGMENTS
  // ==========================================
  describe('2019 Scheme Segment Rules Verification', () => {
    test('Segment 1 (National Initiatives): NSS Volunteer 2 Years gives 60 points', () => {
      const facts = {
        activityCategory: 'National Initiatives',
        subcategory: 'NSS',
        eventName: 'NSS Volunteer Activities',
        achievement: 'Completed 2 Years',
        duration: '2 Years',
        certificateDate: '2023-04-10'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-NAT-NSS-01');
      assert.strictEqual(result.finalPoints, 60);
      assert.strictEqual(result.processingStatus, 'COUNTED');
    });

    test('Segment 2 (Sports & Games): State Level Participation (Level III) gives 25 points', () => {
      const facts = {
        activityCategory: 'Sports & Games',
        subcategory: 'Sports',
        eventName: 'KTU Inter-Collegiate State Athletics',
        level: 'State',
        achievement: 'Participation',
        certificateDate: '2023-02-15'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-SPT-SPORTS-01');
      assert.strictEqual(result.finalPoints, 25);
    });

    test('Segment 2 (Sports & Games): National Level First Prize (Level IV Winner) gives 40 + 20 = 60 base points', () => {
      const facts = {
        activityCategory: 'Sports & Games',
        subcategory: 'Sports',
        eventName: 'All India National Games',
        level: 'National',
        achievement: 'First Prize Winner',
        certificateDate: '2023-05-20'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-SPT-SPORTS-01');
      assert.strictEqual(result.basePoints, 60);
      assert.strictEqual(result.finalPoints, 60);
    });

    test('Segment 3 (Cultural Activities): Zonal First Prize (Level II Winner) gives 12 + 10 = 22 points', () => {
      const facts = {
        activityCategory: 'Cultural Activities',
        subcategory: 'Music',
        eventName: 'Zonal Arts Fest',
        level: 'Zonal',
        achievement: 'First Prize',
        certificateDate: '2023-03-12'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-CUL-MUSIC-01');
      assert.strictEqual(result.finalPoints, 22);
    });

    test('Segment 4 (Professional Self Initiatives): MOOC Assessment Certificate gives 50 points', () => {
      const facts = {
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        eventName: 'NPTEL Machine Learning Course',
        achievement: 'Completed with Certificate',
        certificateDate: '2023-07-01'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-PRO-MOOC-01');
      assert.strictEqual(result.finalPoints, 50);
    });

    test('Segment 4 (Professional Self Initiatives): Paper Presentation at IIT/NIT gives 30 points (plus 10 for recognition = 40)', () => {
      const facts = {
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'Paper Presentation',
        eventName: 'IIT Bombay National Technical Conference',
        organizer: 'IIT Bombay',
        achievement: 'Paper Presentation',
        certificateDate: '2023-09-15'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-PRO-IIT-PAPER-01');
      assert.strictEqual(result.finalPoints, 30);
    });

    test('Segment 5 (Entrepreneurship & Innovation): Patent Filed awards 30 points, Startup Company awards 60 points', () => {
      const patentFacts = {
        activityCategory: 'Entrepreneurship and Innovation',
        subcategory: 'Patent',
        eventName: 'Smart Irrigation Patent Filing',
        achievement: 'Patent-Filed',
        certificateDate: '2023-10-01'
      };
      const patentRes = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: patentFacts
      });
      assert.strictEqual(patentRes.matchedRuleId, '2019-ENT-PAT-FILED-01');
      assert.strictEqual(patentRes.finalPoints, 30);

      const startupFacts = {
        activityCategory: 'Entrepreneurship and Innovation',
        subcategory: 'Start-up',
        eventName: 'Registered Tech Startup',
        achievement: 'Start-up Company – Registered legally',
        certificateDate: '2023-11-01'
      };
      const startupRes = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: startupFacts
      });
      assert.strictEqual(startupRes.matchedRuleId, '2019-ENT-STARTUP-01');
      assert.strictEqual(startupRes.finalPoints, 60);
    });

    test('Segment 6 (Leadership & Management): College Union Elected Chairman gives 30 points', () => {
      const facts = {
        activityCategory: 'Leadership & Management',
        subcategory: 'Elected Student Representative',
        eventName: 'College Student Union',
        role: 'Chairman',
        achievement: 'Chairman',
        certificateDate: '2023-08-01'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2019-LDR-ELECTED-01');
      assert.strictEqual(result.finalPoints, 30);
    });
  });

  // ==========================================
  // 2. 2024 SCHEME TESTS ACROSS ALL 3 GROUPS
  // ==========================================
  describe('2024 Scheme Group Rules Verification', () => {
    test('Group I (1.1): Sports Participation at State Level (Level 3) gives 10 points', () => {
      const facts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Sports/Games/Arts Participation',
        eventName: 'KTU State Athletics Meet',
        level: 'State Events (Level 3)',
        achievement: 'Participation',
        certificateDate: '2024-10-10'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G1-1.1');
      assert.strictEqual(result.finalPoints, 10);
    });

    test('Group I (1.5): Four-wheeler driving license awards 5 points', () => {
      const facts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Four-wheeler license',
        eventName: 'Driving License Issued',
        certificateDate: '2024-11-01'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G1-1.5');
      assert.strictEqual(result.finalPoints, 5);
    });

    test('Group I (1.8): Blood donation gives 5 points (Max 10)', () => {
      const facts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Blood donation',
        eventName: 'Blood Donation Camp',
        certificateDate: '2024-09-15'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G1-1.8');
      assert.strictEqual(result.finalPoints, 5);
    });

    test('Group II (2.21): English Proficiency - IELTS Band 7.5 awards 30 points', () => {
      const facts = {
        activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
        subcategory: 'English Proficiency Certifications',
        eventName: 'IELTS Academic Exam',
        standardizedTestScore: '7.5',
        certificateDate: '2024-12-01'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G2-2.21');
      assert.strictEqual(result.finalPoints, 30);
    });

    test('Group II (2.22): Aptitude Proficiency - GRE Score 325 awards 30 points', () => {
      const facts = {
        activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
        subcategory: 'Aptitude Proficiency Certifications',
        eventName: 'GRE Examination',
        standardizedTestScore: '325',
        certificateDate: '2025-01-10'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G2-2.22');
      assert.strictEqual(result.finalPoints, 30);
    });

    test('Group III (3.3): Long-Term Internship (3.5 months) awards 15 points', () => {
      const facts = {
        activityCategory: 'Group III: Industry Exposure, Academic Projects & Internships',
        subcategory: 'Long-Term Internship',
        eventName: 'Full Stack Engineering Internship',
        duration: '4 months',
        certificateDate: '2025-02-15'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G3-3.3');
      assert.strictEqual(result.finalPoints, 15);
    });

    test('Group III (3.15): National Hackathon 1st Prize awards 40 points', () => {
      const facts = {
        activityCategory: 'Group III: Industry Exposure, Academic Projects & Internships',
        subcategory: 'National Hackathons',
        eventName: 'Smart India Hackathon 2024',
        achievement: '1st Prize',
        certificateDate: '2024-12-20'
      };
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts
      });
      assert.strictEqual(result.matchedRuleId, '2024-G3-3.15');
      assert.strictEqual(result.finalPoints, 40);
    });
  });

  // ==========================================
  // 3. CRITICAL GENERAL RULES VERIFICATION
  // ==========================================
  describe('General Rules Enforcement', () => {
    test('General Rule i: Winning and participation cannot be combined for the same event (supersedes with winning delta)', () => {
      const existingCerts = [
        {
          _id: 'cert_part_1',
          eventName: 'KTU TechFest 2024',
          activityCategory: 'group_2',
          matchedRuleId: '2024-G2-2.1',
          finalPoints: 10,
          processingStatus: 'COUNTED'
        }
      ];

      // New certificate is 1st Prize Winner in the SAME event (base points 20 at state level)
      const winningFacts = {
        activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
        subcategory: 'Tech-Fest-Winners',
        eventName: 'KTU TechFest 2024',
        level: 'State Events (Level 3)',
        achievement: 'First Prize Winner',
        certificateDate: '2024-10-15'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: winningFacts,
        existingCertificates: existingCerts
      });

      // Base points for State Win = 20. Already got 10 for participation -> Delta awarded is 10.
      assert.strictEqual(result.finalPoints, 10);
      assert.strictEqual(result.processingStatus, 'COUNTED');
    });

    test('General Rule i: Participation submitted after winning already counted for same event awards 0 points', () => {
      const existingCerts = [
        {
          _id: 'cert_win_1',
          eventName: 'KTU TechFest 2024',
          activityCategory: 'group_2',
          matchedRuleId: '2024-G2-2.2',
          finalPoints: 20,
          processingStatus: 'COUNTED'
        }
      ];

      const participationFacts = {
        activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
        subcategory: 'Tech-Fest-Participation',
        eventName: 'KTU TechFest 2024',
        level: 'State Events (Level 3)',
        achievement: 'Participation',
        certificateDate: '2024-10-15'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: participationFacts,
        existingCertificates: existingCerts
      });

      assert.strictEqual(result.finalPoints, 0);
      assert.strictEqual(result.processingStatus, 'NOT_ELIGIBLE');
      assert.ok(result.statusReason.includes('Participation points cannot be combined with winning points'));
    });

    test('General Rule vi: Certificates dated BEFORE student admission year are rejected with 0 points', () => {
      // Student admitted in 2024, certificate is from 2022
      const preAdmissionFacts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Sports/Games/Arts Participation',
        eventName: 'High School Sports Meet',
        level: 'State Events (Level 3)',
        achievement: 'Participation',
        certificateDate: '2022-05-10'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: preAdmissionFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.finalPoints, 0);
      assert.strictEqual(result.processingStatus, 'NOT_ELIGIBLE');
      assert.ok(result.statusReason.includes('Activities completed before joining the programme are not eligible'));
    });

    test('Subactivity Cap: Blood donation is capped at 10 points (2 donations)', () => {
      const existingCerts = [
        {
          _id: 'cert_bd_1',
          activityCategory: 'group_1',
          matchedRuleId: '2024-G1-1.8',
          finalPoints: 5,
          processingStatus: 'COUNTED'
        },
        {
          _id: 'cert_bd_2',
          activityCategory: 'group_1',
          matchedRuleId: '2024-G1-1.8',
          finalPoints: 5,
          processingStatus: 'COUNTED'
        }
      ];

      // 3rd donation
      const facts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Blood donation',
        eventName: 'Blood Donation Camp 3',
        certificateDate: '2025-03-01'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: facts,
        existingCertificates: existingCerts
      });

      assert.strictEqual(result.finalPoints, 0);
      assert.strictEqual(result.processingStatus, 'COUNTED');
      assert.ok(result.statusReason.includes('maximum point limit for this activity'));
    });
  });
});

