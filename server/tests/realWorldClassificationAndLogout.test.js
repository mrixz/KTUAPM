import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DocumentValidator } from '../src/services/pipeline/documentValidator.js';
import { EvidenceValidator } from '../src/services/pipeline/EvidenceValidator.js';
import { GeminiCertificateAnalyzer } from '../src/services/ai/GeminiCertificateAnalyzer.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { RuleEngine } from '../src/services/rules/RuleEngine.js';
import {
  PROCESSING_STATUS,
  EVIDENCE_STATUS,
  RULE_EVALUATION_STATUS
} from '../src/config/constants.js';

describe('KTUAPM Real-World Certificate Classification, Level & Evidence Hardening', () => {
  const analyzer = new GeminiCertificateAnalyzer();

  const mockProfile2019 = {
    scheme: '2019',
    entryType: 'regular',
    ruleVersion: '2019-v1',
    requiredPoints: 100,
    maximumPoints: 100,
    admissionYear: 2021
  };

  const mockProfile2024 = {
    scheme: '2024',
    entryType: 'regular',
    ruleVersion: '2024-v1',
    requiredPoints: 120,
    maximumPoints: 120,
    admissionYear: 2024
  };

  // ============================================================
  // REAL FAILURE CASE 1: QUIZ MISCLASSIFIED AS CONFERENCE
  // ============================================================
  describe('Case 1: Quiz Classification & Event Level Anti-Hallucination', () => {
    const luminisQuizText = `
      CERTIFICATE OF PARTICIPATION
      This is to certify that AMAR NAND K C
      for participating in the 'Luminis' Quiz
      as part of the 'Luminis-24' National Space Day celebrations
      hosted at Govt. College of Engineering, Kannur
      on 23rd August 2024.
    `;

    test('Luminis Quiz is classified as Quiz / Technical Quiz, NOT Conference or Presentation', async () => {
      const validation = DocumentValidator.validateDocument({
        text: luminisQuizText,
        filename: 'luminis_quiz_cert.pdf'
      });
      assert.strictEqual(validation.isValidCertificate, true);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);

      const facts = await analyzer.analyze({
        text: luminisQuizText,
        filename: 'luminis_quiz_cert.pdf'
      });

      assert.strictEqual(facts.isCertificate, true);
      assert.strictEqual(facts.activityCategory, 'Professional Self-Initiatives');
      assert.strictEqual(facts.subcategory, 'Tech Quiz');
      assert.strictEqual(facts.achievement, 'Participation');
      assert.notStrictEqual(facts.subcategory, 'Conference');
      assert.notStrictEqual(facts.achievement, 'Presentation');
      assert.strictEqual(facts.eventName, 'Luminis Quiz');
    });

    test('"National Space Day" does NOT hallucinate eventLevel = National', async () => {
      const facts = await analyzer.analyze({
        text: luminisQuizText,
        filename: 'luminis_quiz_cert.pdf'
      });

      // Level must NOT be set to National because "National Space Day" is an occasion name
      assert.notStrictEqual(
        facts.level,
        'National',
        'Level must not be set to National merely because the occasion is National Space Day'
      );
      assert.strictEqual(facts.level, null, 'Level should be null / unevidenced');
    });

    test('Luminis Quiz with unknown level produces INSUFFICIENT_RULE_DATA, NOT INVALID_EVIDENCE', async () => {
      const facts = await analyzer.analyze({
        text: luminisQuizText,
        filename: 'luminis_quiz_cert.pdf'
      });

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: facts,
        existingCertificates: []
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
        'Reason should inform student that event level is needed to calculate points'
      );
    });

    test('Luminis Quiz when verified at College level awards 10 points under 2019 Sl. 8', () => {
      const factsWithLevel = {
        certificateTitle: 'Luminis Quiz Certificate',
        activityCategory: 'Professional Self-Initiatives',
        subcategory: 'Tech Quiz',
        eventName: 'Luminis Quiz',
        achievement: 'Participation',
        level: 'College / Institution',
        llmConfidence: 0.90
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: factsWithLevel,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-TECHFEST-01');
      assert.strictEqual(result.finalPoints, 10);
    });
  });

  // ============================================================
  // EVENT LEVEL ANTI-HALLUCINATION AUDIT
  // ============================================================
  describe('Event Level Anti-Hallucination Audit', () => {
    const testCases = [
      {
        name: 'National Science Day celebration',
        text: 'Certificate of Participation presented to Test Student for participating in Science Quiz on National Science Day at Test College',
        expectedNotLevel: 'National'
      },
      {
        name: 'National Service Scheme occasion',
        text: 'Certificate of Participation presented to Test Student on National Service Scheme day celebrations',
        expectedNotLevel: 'National'
      },
      {
        name: 'National Institute of Technology host name',
        text: 'Certificate of Participation presented to Test Student for attending coding session at National Institute of Technology Calicut',
        expectedNotLevel: 'National'
      },
      {
        name: 'World Environment Day commemoration',
        text: 'Certificate of Participation presented to Test Student for participating in poster event on World Environment Day',
        expectedNotLevel: 'International'
      },
      {
        name: 'State Bank of India sponsor',
        text: 'Certificate of Participation presented to Test Student for participating in debate sponsored by State Bank of India',
        expectedNotLevel: 'State / Inter-University'
      }
    ];

    for (const tc of testCases) {
      test(`Token in occasion/organization: ${tc.name} does not hallucinate level`, async () => {
        const facts = await analyzer.analyze({
          text: tc.text,
          filename: 'test_cert.pdf'
        });
        assert.notStrictEqual(
          facts.level,
          tc.expectedNotLevel,
          `Failed: ${tc.name} must not trigger ${tc.expectedNotLevel}`
        );
      });
    }

    test('Explicit scope "National-level competition" DOES set National level', async () => {
      const explicitNationalText = `
        CERTIFICATE OF PARTICIPATION
        Presented to Test Student for participating in the National-level competition
        organized by All India Engineering Council.
      `;
      const facts = await analyzer.analyze({
        text: explicitNationalText,
        filename: 'national_comp.pdf'
      });
      assert.strictEqual(facts.level, 'National');
    });
  });

  // ============================================================
  // REAL FAILURE CASE 2: CLEAR IEEE WORKSHOP NOT CLASSIFIED
  // ============================================================
  describe('Case 2: IEEE SIGHT Workshop Semantic Extraction & 0 Points Eligibility', () => {
    const ieeeWorkshopText = `
      CERTIFICATE OF PARTICIPATION
      AMAR NAND K C
      for actively participating in the IoT Workshop,
      conducted on August 20, 2024
      organized under the auspices of IEEE SIGHT GCEK
    `;

    test('IEEE SIGHT workshop extracted as WORKSHOP, PARTICIPATION, IEEE SIGHT GCEK', async () => {
      const validation = DocumentValidator.validateDocument({
        text: ieeeWorkshopText,
        filename: 'ieee_workshop_cert.pdf'
      });
      assert.strictEqual(validation.isValidCertificate, true);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);

      const facts = await analyzer.analyze({
        text: ieeeWorkshopText,
        filename: 'ieee_workshop_cert.pdf'
      });

      assert.strictEqual(facts.isCertificate, true);
      assert.strictEqual(facts.subcategory, 'Workshop');
      assert.strictEqual(facts.achievement, 'Participation');
      assert.strictEqual(facts.eventName, 'IoT Workshop');
      assert.strictEqual(facts.organizer, 'IEEE SIGHT GCEK');
      assert.notStrictEqual(facts.subcategory, 'Conference');
    });

    test('IEEE SIGHT GCEK workshop under 2019 Scheme receives 0 points with clear scheme reason', async () => {
      const facts = await analyzer.analyze({
        text: ieeeWorkshopText,
        filename: 'ieee_workshop_cert.pdf'
      });

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: facts,
        existingCertificates: []
      });

      // Valid evidence accepted, but 0 points because not at IITs/NITs
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.ruleEvaluationStatus, RULE_EVALUATION_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.finalPoints, 0);
      assert.ok(
        result.statusReason.includes('IITs/NITs'),
        'Reason should inform student that 2019 workshops must be conducted at IITs/NITs'
      );
    });
  });

  // ============================================================
  // REAL FAILURE CASE 3: NON-STANDARD PARTICIPATION WORDING
  // ============================================================
  describe('Case 3: Non-standard participation wording accepted', () => {
    const formulaBharatText = `
      CERTIFICATE OF PARTICIPATION
      This certificate is being presented to
      Rahul Verma
      for their participation in the Formula Bharat 2026 competition
      organized by Curiosum Tech Private Limited
      held from 19th to 24th January 2026.
    `;

    test('"for their participation in" satisfies affirmative evidence validation', () => {
      const validation = DocumentValidator.validateDocument({
        text: formulaBharatText,
        filename: 'formula_bharat_cert.pdf'
      });

      assert.strictEqual(
        validation.isValidCertificate,
        true,
        'Should not require "This is to certify that"'
      );
      assert.strictEqual(
        validation.evidenceStatus,
        EVIDENCE_STATUS.VALID_EVIDENCE
      );
    });

    test('Formula Bharat competition extracts recipient and event name accurately', async () => {
      const facts = await analyzer.analyze({
        text: formulaBharatText,
        filename: 'formula_bharat_cert.pdf'
      });

      assert.strictEqual(facts.isCertificate, true);
      assert.strictEqual(facts.participantName, 'Rahul Verma');
      assert.strictEqual(facts.eventName, 'Formula Bharat 2026');
      assert.strictEqual(facts.achievement, 'Participation');
    });
  });

  // ============================================================
  // REAL FAILURE CASE 4: EXPLICIT WORKSHOP PARTICIPATION REJECTED
  // ============================================================
  describe('Case 4: Workshop without "This is to certify that" & Parent Fest Scope', () => {
    const xploreWorkshopText = `
      CERTIFICATE OF PARTICIPATION
      PROUDLY PRESENTED TO
      AMAR NAND K C
      FOR PARTICIPATING IN THE WORKSHOP:
      3D PRINTING AND DESIGNING
      ORGANIZED AS PART OF
      NATIONAL-LEVEL MULTI-FEST XPLORE'24
      OF GOVERNMENT COLLEGE OF ENGINEERING KANNUR
    `;

    test('3D Printing workshop certificate is accepted as VALID_EVIDENCE', () => {
      const validation = EvidenceValidator.evaluateEvidence({
        text: xploreWorkshopText,
        filename: '3d_printing_workshop.pdf'
      });

      assert.strictEqual(
        validation.evidenceStatus,
        EVIDENCE_STATUS.VALID_EVIDENCE,
        'Explicit participation in workshop must satisfy evidence validation'
      );
    });

    test('Parent multi-fest scope is not automatically copied into workshop subactivity level', async () => {
      const facts = await analyzer.analyze({
        text: xploreWorkshopText,
        filename: '3d_printing_workshop.pdf'
      });

      assert.strictEqual(facts.isCertificate, true);
      assert.strictEqual(facts.subcategory, 'Workshop');
      assert.strictEqual(facts.achievement, 'Participation');
      assert.strictEqual(facts.eventName, '3D Printing and Designing');

      // Workshop subactivity should NOT be assigned National level just because parent fest was national
      assert.notStrictEqual(
        facts.level,
        'National',
        'Subactivity must not blindly inherit parent multi-fest level'
      );
    });

    test('3D Printing workshop at GCE Kannur under 2019 Scheme receives 0 points with clear scheme reason', async () => {
      const facts = await analyzer.analyze({
        text: xploreWorkshopText,
        filename: '3d_printing_workshop.pdf'
      });

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: facts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.finalPoints, 0);
      assert.ok(
        result.statusReason.includes('IITs/NITs'),
        'Reason should inform student that 2019 eligible workshops must be conducted at IITs/NITs'
      );
    });
  });

  // ============================================================
  // DETERMINISTIC RULE PRECEDENCE: TECH QUIZ VS PROFESSIONAL SOCIETY
  // ============================================================
  describe('Rule Precedence: Tech Quiz vs Professional Society Competition', () => {
    test('Quiz conducted by IEEE Student Branch matches Professional Societies rule (Sl. No. 10)', () => {
      const ieeeQuizFacts = {
        certificateTitle: 'Technical Quiz Certificate',
        activityCategory: 'Professional Self-Initiatives',
        subcategory: 'Tech Quiz',
        eventName: 'IEEE Tech Quiz',
        organizer: 'IEEE Student Branch GCEK',
        achievement: 'Participation',
        level: 'College / Institution',
        relevantText: 'IEEE Student Branch Certificate of Participation for participating in Technical Quiz',
        llmConfidence: 0.90
      };

      const match = RuleEngine.matchRule({
        scheme: '2019',
        ruleVersion: '2019-v1',
        entryType: 'regular',
        facts: ieeeQuizFacts
      });

      assert.ok(match.matchedRule, 'Expected matching rule');
      assert.strictEqual(
        match.matchedRule.ruleId,
        '2019-PRO-SOCIETY-01',
        'IEEE organized quiz should match Professional Societies rule (Sl. 10)'
      );

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: ieeeQuizFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-SOCIETY-01');
      assert.strictEqual(result.finalPoints, 10);
    });

    test('Quiz conducted as general college tech fest matches Tech Fest / Tech Quiz rule (Sl. No. 8)', () => {
      const festQuizFacts = {
        certificateTitle: 'Tech Fest Quiz Certificate',
        activityCategory: 'Professional Self-Initiatives',
        subcategory: 'Tech Quiz',
        eventName: 'Annual Tech Fest Quiz',
        organizer: 'Government College of Engineering Kannur',
        achievement: 'Participation',
        level: 'College / Institution',
        relevantText: 'College Tech Fest Technical Quiz Competition',
        llmConfidence: 0.90
      };

      const match = RuleEngine.matchRule({
        scheme: '2019',
        ruleVersion: '2019-v1',
        entryType: 'regular',
        facts: festQuizFacts
      });

      assert.ok(match.matchedRule, 'Expected matching rule');
      assert.strictEqual(
        match.matchedRule.ruleId,
        '2019-PRO-TECHFEST-01',
        'Non-society tech fest quiz should match Tech Fest / Tech Quiz rule (Sl. 8)'
      );

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: mockProfile2019,
        extractedFacts: festQuizFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-TECHFEST-01');
      assert.strictEqual(result.finalPoints, 10);
    });
  });

  // ============================================================
  // LOGOUT SECURITY & SINGLE BROWSER REVOCATION
  // ============================================================
  describe('Logout Security & Cookie Teardown Audit', () => {
    test('Logout clears cookie with matching path, httpOnly, sameSite attributes', async () => {
      // Simulate Express response object
      const cookiesCleared = [];
      const cookiesSet = [];

      const mockRes = {
        clearCookie(name, options) {
          cookiesCleared.push({ name, options });
          return this;
        },
        cookie(name, val, options) {
          cookiesSet.push({ name, val, options });
          return this;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        }
      };

      const { logout } = await import('../src/controllers/authController.js');
      await logout({}, mockRes);

      assert.strictEqual(mockRes.statusCode, 200);
      assert.strictEqual(mockRes.body.success, true);
      assert.strictEqual(mockRes.body.message, 'Logged out successfully.');

      // Check clearCookie
      assert.strictEqual(cookiesCleared.length, 1);
      assert.strictEqual(cookiesCleared[0].name, 'token');
      assert.strictEqual(cookiesCleared[0].options.path, '/');
      assert.strictEqual(cookiesCleared[0].options.httpOnly, true);

      // Check expired cookie fallback
      assert.strictEqual(cookiesSet.length, 1);
      assert.strictEqual(cookiesSet[0].name, 'token');
      assert.strictEqual(cookiesSet[0].options.path, '/');
      assert.strictEqual(cookiesSet[0].options.expires.getTime(), 0);
    });
  });
});
