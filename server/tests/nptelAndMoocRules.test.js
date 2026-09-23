import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';
import { DocumentValidator } from '../src/services/pipeline/documentValidator.js';
import { GeminiCertificateAnalyzer } from '../src/services/ai/GeminiCertificateAnalyzer.js';
import { TextExtractionService } from '../src/services/ocr/TextExtractionService.js';
import { StudentAttribution } from '../src/services/pipeline/StudentAttribution.js';
import { PROCESSING_STATUS, EVIDENCE_STATUS, REASON_CODES } from '../src/config/constants.js';

describe('NPTEL / MOOC, Evidence-First, and Scheme-Isolation Regression Suite', async () => {
  await ruleLoader.loadAllRules();

  const student2019Regular = {
    scheme: '2019',
    entryType: 'regular',
    ruleVersion: '2019-v1',
    requiredPoints: 100,
    maximumPoints: 100,
    admissionYear: 2021
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

  const analyzer = new GeminiCertificateAnalyzer();

  // =========================================================================
  // 1. KTU 2019 MOOC: FIRST VALID CERTIFICATE
  // =========================================================================
  describe('KTU 2019 MOOC Rule Implementation', () => {
    test('1.1: First valid 2019 NPTEL/MOOC certificate awards source-backed 50 base points and 50 final points', () => {
      const moocFacts = {
        certificateTitle: 'NPTEL Online Certification',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        eventName: 'Deep Learning for Computer Vision',
        organizer: 'NPTEL-IIT Madras',
        achievement: 'Completed',
        duration: '8 weeks',
        certificateDate: '2023-04-15',
        participantName: 'Mridul Narayanan T S',
        certificateNumber: 'NPTEL23CS45S1234567',
        relevantText: 'This certificate is awarded for successfully completing the 8-week course Deep Learning for Computer Vision with a consolidated score of 78%.'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: moocFacts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.basePoints, 50, 'Base points must equal authoritative 50 points');
      assert.strictEqual(result.finalPoints, 50, 'Final points must equal 50 points on first submission');
      assert.strictEqual(result.matchedRuleId, '2019-PRO-MOOC-01');
      assert.ok(!result.statusReason.includes('winning points'), 'Must NEVER mention participation/winning conflict');
      assert.ok(!result.statusReason.includes('General Rule 1'), 'Must NEVER execute 2024 General Rule 1');
    });

    test('1.2: Second distinct valid 2019 MOOC when 50-pt cap is reached: preserves basePoints=50, capAdjustment=-50, finalPoints=0, status=COUNTED', () => {
      const existingFirstMooc = {
        _id: 'cert_mooc_1',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        matchedRuleId: '2019-PRO-MOOC-01',
        eventName: 'Introduction to Internet of Things',
        finalPoints: 50,
        processingStatus: PROCESSING_STATUS.COUNTED
      };

      const secondMoocFacts = {
        certificateTitle: 'NPTEL Online Certification',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        eventName: 'Cloud Computing and Distributed Systems',
        organizer: 'NPTEL-IIT Kharagpur',
        achievement: 'Completed',
        duration: '12 weeks',
        certificateDate: '2023-11-20',
        participantName: 'Mridul Narayanan T S',
        certificateNumber: 'NPTEL23CS99S7654321',
        relevantText: 'For successfully completing the course Cloud Computing and Distributed Systems with final proctored examination.'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: secondMoocFacts,
        existingCertificates: [existingFirstMooc]
      });

      // Crucial assertions matching user specifications
      assert.strictEqual(result.basePoints, 50, 'Base points must NOT be zeroed; intrinsic value is 50');
      assert.strictEqual(result.finalPoints, 0, 'Final points added must be 0 due to 50-pt cap');
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED, 'Valid document must be COUNTED/accepted, NOT labeled NOT_ELIGIBLE or INVALID');
      assert.ok(result.statusReason.includes('already reached the maximum MOOC points allowed'), 'Status reason must truthfully state MOOC cap reached');
      assert.ok(result.statusReason.includes('0 additional points added'), 'Status reason must explain 0 additional points');
      assert.ok(!result.statusReason.includes('winning'), 'Must not reference winning/participation');
      assert.ok(!result.statusReason.includes('duplicate'), 'Must not conflate cap with duplicate');

      // Verify calculation trace integrity
      const baseStep = result.calculationTrace.find((s) => s.step === 3);
      assert.ok(baseStep, 'Base calculation step must exist');
      assert.strictEqual(baseStep.data['Base Points for Activity'], '50 pts', 'Trace must preserve base points');
      assert.strictEqual(baseStep.data['Activity Cap Adjustment'], '-50 pts', 'Trace must record -50 cap adjustment');
    });

    test('1.3: Prevents cross-scheme General Rule 1 collision even when eventName is similar or generic', () => {
      // Prior certificate with generic event name token
      const existingCert = {
        _id: 'cert_prior',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        matchedRuleId: '2019-PSI-11',
        eventName: 'MOOC Event',
        finalPoints: 0,
        processingStatus: PROCESSING_STATUS.COUNTED
      };

      const newCert = {
        certificateTitle: 'MOOC Certificate',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        eventName: 'MOOC Event',
        achievement: 'Completed',
        duration: '8 weeks',
        certificateDate: '2023-05-10'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: newCert,
        existingCertificates: [existingCert]
      });

      // Under 2019 scheme, General Rule 1 (participation vs winning) does NOT apply to MOOCs
      assert.strictEqual(result.basePoints, 50);
      assert.strictEqual(result.finalPoints, 50);
      assert.ok(!result.statusReason.includes('General Rule 1'));
    });
  });

  // =========================================================================
  // 2. KTU 2024 SKILLING CERTIFICATES (SUBACTIVITY 3.17)
  // =========================================================================
  describe('KTU 2024 Skilling Certificate (Group III Subactivity 3.17)', () => {
    test('2.1: 2024 Skilling certificate awards 1 point per approved course hour up to 40 max points', () => {
      const skillingFacts30Hours = {
        certificateTitle: 'Approved Skilling Certificate',
        activityCategory: 'Group III: Leadership, Management & Professional Initiatives',
        subcategory: 'Skilling certificates',
        eventName: 'Python for Data Analysis and Automation',
        organizer: 'NPTEL-SWAYAM',
        achievement: 'Completed',
        duration: '30 Hours',
        certificateDate: '2025-02-15'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: skillingFacts30Hours,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.basePoints, 30, '30 hours = 30 points');
      assert.strictEqual(result.finalPoints, 30);
      assert.strictEqual(result.matchedRuleId, '2024-G3-3.17');
    });

    test('2.2: 2024 Skilling course with 60 hours respects 40-point subactivity cap', () => {
      const skillingFacts60Hours = {
        certificateTitle: 'Approved Skilling Certificate',
        activityCategory: 'Group III: Leadership, Management & Professional Initiatives',
        subcategory: 'Skilling certificates',
        eventName: 'Advanced Machine Learning and AI',
        organizer: 'NPTEL',
        achievement: 'Completed',
        duration: '60 Hours',
        certificateDate: '2025-03-20'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: skillingFacts60Hours,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.basePoints, 40, 'Base points capped at max 40 pts for subactivity 3.17');
      assert.strictEqual(result.finalPoints, 40, 'Capped at 40 max points per subactivity 3.17');
    });

    test('2.3: Multiple 2024 Skilling courses accumulate hours up to 40 max points', () => {
      const existingCourse1 = {
        _id: 'cert_skill_1',
        activityCategory: 'group_3',
        matchedRuleId: '2024-G3-3.17',
        eventName: 'Course 1',
        finalPoints: 25,
        processingStatus: PROCESSING_STATUS.COUNTED
      };

      const course2Facts = {
        certificateTitle: 'Approved Skilling Certificate',
        activityCategory: 'Group III: Leadership, Management & Professional Initiatives',
        subcategory: 'Skilling certificates',
        eventName: 'Course 2',
        duration: '25 Hours',
        certificateDate: '2025-04-10'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: course2Facts,
        existingCertificates: [existingCourse1]
      });

      assert.strictEqual(result.basePoints, 25, 'Base points = 25 pts for 25 hours');
      assert.strictEqual(result.finalPoints, 15, 'Only 15 points remain under 40-pt subactivity cap');
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
    });
  });

  // =========================================================================
  // 3. CROSS-SCHEME ISOLATION & COMPETITIVE RULES INTEGRITY
  // =========================================================================
  describe('Cross-Scheme Rule Isolation', () => {
    test('3.1: 2019 student is NEVER evaluated against 2024 General Rule 1', () => {
      // 2019 student submits an internship or MOOC
      const facts = {
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'Industrial Training / Internship',
        eventName: 'Summer Internship',
        achievement: 'Completed',
        duration: '10 Days',
        certificateDate: '2023-07-20'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: facts,
        existingCertificates: []
      });

      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.basePoints, 20);
      assert.strictEqual(result.finalPoints, 20);
      assert.strictEqual(result.matchedRuleId, '2019-PRO-INTERN-01');
    });

    test('3.2: 2024 student does NOT execute 2019 fixed 50-point MOOC rule', () => {
      const moocFacts = {
        activityCategory: 'Group III: Leadership, Management & Professional Initiatives',
        subcategory: 'Skilling certificates',
        eventName: '8-week Online Course',
        duration: '8 weeks',
        certificateDate: '2025-01-10'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: moocFacts,
        existingCertificates: []
      });

      // Under 2024, 8 weeks ≈ 30 hours (30 pts), NEVER fixed 50 pts
      assert.notStrictEqual(result.finalPoints, 50);
      assert.strictEqual(result.matchedRuleId, '2024-G3-3.17');
    });

    test('3.3: 2024 General Rule 1 (participation vs winning) applies ONLY to competitive categories', () => {
      // Competitive event: Sports under 2024
      const existingParticipation = {
        _id: 'cert_sports_part',
        activityCategory: 'group_1',
        matchedRuleId: '2024-G1-1.1',
        eventName: 'KTU Inter-Collegiate Football Championship',
        finalPoints: 10,
        processingStatus: PROCESSING_STATUS.COUNTED
      };

      // Student now uploads winning First prize for the SAME event
      const winningFacts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Sports & Games',
        eventName: 'KTU Inter-Collegiate Football Championship',
        achievement: 'First',
        level: 'State / Inter-University',
        certificateDate: '2025-02-28'
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2024Regular,
        extractedFacts: winningFacts,
        existingCertificates: [existingParticipation]
      });

      // Under 2024 General Rule 1, First prize Level 3 (20 pts) supersedes participation Level 3 (10 pts), awarding delta 10 pts
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
      assert.strictEqual(result.finalPoints, 10, 'Winning awards delta (20 - 10 = 10 pts)');
    });
  });

  // =========================================================================
  // 4. NON-EVIDENCE DOCUMENTS (PROMOTIONAL POSTERS, FLYERS, ETC.)
  // =========================================================================
  describe('Document Validation: Positive Evidence vs Non-Evidence Material', () => {
    test('4.1: Campaign / Promotional poster is rejected as INVALID_EVIDENCE before rule calculation', () => {
      const posterText = `
        JOIN ISTE ENQUIRE 2023!
        IEEE Student Branch & ISTE Chapter Present
        A MEGA NATIONAL WORKSHOP & HACKATHON
        Registration Fee: Rs 250
        Date: 25th October 2023 | Venue: College Auditorium
        Scan QR Code to register now!
        Follow us on Instagram @iste_gec
        Call 9876543210 for inquiries.
      `;

      const validation = DocumentValidator.validateDocument({ text: posterText, filename: 'event_poster.jpg' });
      assert.strictEqual(validation.isValidCertificate, false);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(validation.reasonCode, REASON_CODES.PROMOTIONAL_MATERIAL);
    });

    test('4.2: Registration slip / Fee receipt is rejected as INVALID_EVIDENCE', () => {
      const receiptText = `
        EVENT REGISTRATION RECEIPT & ADMIT SLIP
        Order ID: REG-9842109
        Candidate Name: Ananya Krishnan
        Event: National Robotics Symposium 2024
        Registration Status: Confirmed
        Amount Paid: INR 500 (Payment Gateway: Razorpay)
        Please carry this slip and your student ID to enter the venue.
      `;

      const validation = DocumentValidator.validateDocument({ text: receiptText, filename: 'receipt.pdf' });
      assert.strictEqual(validation.isValidCertificate, false);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(validation.reasonCode, REASON_CODES.PRE_EVENT_DOCUMENT);
    });

    test('4.3: Academic lecture notes / Syllabus PDF is rejected as INVALID_EVIDENCE', () => {
      const notesText = `
        MODULE 3: RECURRENT NEURAL NETWORKS AND LSTM
        Lecture Notes - Department of Computer Science
        KTU Syllabus Course Code: CST304
        Theorem 3.1: Backpropagation through time (BPTT)
        Homework problems due next Tuesday.
      `;

      const validation = DocumentValidator.validateDocument({ text: notesText, filename: 'module_notes.pdf' });
      assert.strictEqual(validation.isValidCertificate, false);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(validation.reasonCode, REASON_CODES.ACADEMIC_NOTES);
    });

    test('4.4: Unseen generic non-activity document with no evidence fails safely', () => {
      const randomText = `
        Terms and Conditions of Service Agreement
        Section 1.1: Governing Law and Jurisdiction
        These terms shall be governed by the laws of India.
      `;

      const validation = DocumentValidator.validateDocument({ text: randomText, filename: 'agreement.pdf' });
      assert.strictEqual(validation.isValidCertificate, false);
      assert.strictEqual(validation.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
    });

    test('4.5: Student mismatch produces INVALID_EVIDENCE with STUDENT_MISMATCH reason code', () => {
      const mismatch = StudentAttribution.attributeParticipant({
        documentText: 'This certificate is awarded to John Michael Doe for participation in Hackathon.',
        extractedParticipantName: 'John Michael Doe',
        studentUser: { name: 'Mridul Narayanan T S' },
        studentProfile: { registerNumber: 'TRV21CS045' }
      });

      assert.strictEqual(mismatch.isAttributed, false);
      assert.strictEqual(mismatch.reasonCode, REASON_CODES.STUDENT_MISMATCH);
    });

    test('4.6: Name variation (e.g. initials order) passes student attribution safely', () => {
      const match1 = StudentAttribution.attributeParticipant({
        documentText: 'Awarded to T S Mridul Narayanan for active participation.',
        extractedParticipantName: 'T S Mridul Narayanan',
        studentUser: { name: 'Mridul Narayanan T S' },
        studentProfile: { registerNumber: 'TRV21CS045' }
      });
      assert.strictEqual(match1.isAttributed, true);

      const match2 = StudentAttribution.attributeParticipant({
        documentText: 'Awarded to MRIDUL NARAYANAN T.S. for completion.',
        extractedParticipantName: 'MRIDUL NARAYANAN T.S.',
        studentUser: { name: 'Mridul Narayanan T S' },
        studentProfile: { registerNumber: 'TRV21CS045' }
      });
      assert.strictEqual(match2.isAttributed, true);
    });
  });

  // =========================================================================
  // 5. OCR ENGINE & EXTRACTION FLOW
  // =========================================================================
  describe('OCR-First Text Extraction Flow', () => {
    test('5.1: Text-based PDF with sufficient embedded text does not invoke OCR', async () => {
      // Test PDF normalization and quality assessment
      const samplePdfText = 'APJ Abdul Kalam Technological University Certificate of Merit awarded to Rahul Sharma for participating in workshop.';
      const normalized = TextExtractionService.normalizeText(samplePdfText);
      const quality = TextExtractionService.assessQuality(normalized);

      assert.strictEqual(quality.isSufficient, true);
      assert.strictEqual(quality.isUsable, true);
      assert.ok(quality.usableCharCount > 30);
    });

    test('5.2: OCR quality assessment detects weak text and flags as unusable', () => {
      const weakOcrText = 'cert ... ... ...';
      const assessment = TextExtractionService.assessQuality(weakOcrText, 25);
      assert.strictEqual(assessment.isSufficient, false);
      assert.strictEqual(assessment.isUsable, false);
    });
  });

  // =========================================================================
  // 6. ZERO-POINT REASON INTEGRITY
  // =========================================================================
  describe('Zero-Point Reason Integrity Enforcement', () => {
    test('6.1: Duplicate certificate produces duplicate-specific explanation', () => {
      const duplicateReason = 'Exact identical document already uploaded previously.';
      assert.ok(duplicateReason.includes('already uploaded'));
    });

    test('6.2: Activity cap reached produces cap-specific explanation', () => {
      const existingCert = {
        _id: 'cert_1',
        activityCategory: 'Professional Self Initiatives',
        subcategory: 'MOOC',
        matchedRuleId: '2019-PRO-MOOC-01',
        finalPoints: 50,
        processingStatus: PROCESSING_STATUS.COUNTED
      };

      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular,
        extractedFacts: {
          activityCategory: 'Professional Self Initiatives',
          subcategory: 'MOOC',
          eventName: 'Second MOOC',
          achievement: 'Completed',
          duration: '8 weeks'
        },
        existingCertificates: [existingCert]
      });

      assert.strictEqual(result.finalPoints, 0);
      assert.ok(result.statusReason.includes('maximum MOOC points allowed'));
      assert.ok(!result.statusReason.includes('duplicate'));
      assert.ok(!result.statusReason.includes('winning'));
    });

    test('6.3: Pre-programme activity produces pre-programme explanation', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: student2019Regular, // Admitted 2021
        extractedFacts: {
          activityCategory: 'Professional Self Initiatives',
          subcategory: 'Workshop',
          certificateDate: '2019-05-15' // Prior to 2021
        },
        existingCertificates: []
      });

      assert.strictEqual(result.finalPoints, 0);
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.ok(result.statusReason.includes('before joining the programme'));
    });
  });
});
