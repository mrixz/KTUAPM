import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TextExtractionService } from '../src/services/ocr/TextExtractionService.js';
import { EvidenceValidator } from '../src/services/pipeline/EvidenceValidator.js';
import { StudentAttribution } from '../src/services/pipeline/StudentAttribution.js';
import { CertificateProcessingPipeline } from '../src/services/pipeline/CertificateProcessingPipeline.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import {
  EVIDENCE_STATUS,
  DOCUMENT_PURPOSES,
  REASON_CODES,
  PROCESSING_STATUS,
  EXTRACTION_SOURCES
} from '../src/config/constants.js';

describe('Production OCR, Evidence Validation & Pipeline Boundary Tests', () => {

  // =========================================================================
  // PART X1: OCR EXTRACTION TESTS
  // =========================================================================
  describe('X1: OCR Extraction & Quality Assessment', () => {
    it('X1.1 Text-based PDF: Uses embedded text without invoking OCR when text is sufficient', async () => {
      const textContent = 'This is to certify that Mridul Narayanan has successfully completed the 5-day National Workshop on Cloud Computing and Artificial Intelligence.';
      const pdfBuffer = Buffer.from('%PDF-1.4 mock pdf header');

      // Extract using TextExtractionService with mockPdfResult (simulating embedded pdf stream)
      const result = await TextExtractionService.extract({
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
        filename: 'text_cert.pdf',
        options: {
          mockPdfResult: {
            text: textContent,
            numPages: 1
          }
        }
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.sourceType, EXTRACTION_SOURCES.EMBEDDED_PDF_TEXT);
      assert.ok(result.text.includes('Mridul Narayanan'));
      assert.strictEqual(result.quality.isUsable, true);
      assert.ok(result.quality.meaningfulWordCount >= 5);
    });

    it('X1.2 Scanned PDF fallback: Falls back to image/OCR extraction when PDF has no embedded text', async () => {
      const emptyPdfBuffer = Buffer.from('%PDF-1.4 mock empty pdf');

      // Mock OCR runner to avoid slow WebAssembly execution in unit tests
      const originalOcr = TextExtractionService.extractImageTextWithOCR;
      try {
        TextExtractionService.extractImageTextWithOCR = async () => ({
          text: 'National Level Certificate of Participation awarded to Mridul Narayanan for Hackathon 2024.',
          confidence: 88,
          pagesProcessed: 1
        });

        const result = await TextExtractionService.extract({
          buffer: emptyPdfBuffer,
          mimeType: 'application/pdf',
          filename: 'scanned_cert.pdf',
          options: {
            mockPdfResult: {
              text: '',
              numPages: 1
            }
          }
        });

        assert.strictEqual(result.success, true);
        assert.ok([EXTRACTION_SOURCES.OCR_SCANNED_PDF, EXTRACTION_SOURCES.OCR_IMAGE, EXTRACTION_SOURCES.VISION_FALLBACK].includes(result.sourceType));
      } finally {
        TextExtractionService.extractImageTextWithOCR = originalOcr;
      }
    });

    it('X1.3 Image files: Invokes OCR extraction directly for JPG and PNG', async () => {
      const imgBuffer = Buffer.from('mock-png-binary-content-12345');
      const originalOcr = TextExtractionService.extractImageTextWithOCR;
      try {
        TextExtractionService.extractImageTextWithOCR = async (bufOrObj, options) => {
          return {
            text: 'CERTIFICATE OF MERIT awarded to T S Mridul Narayanan for First Prize in CodeRelay.',
            confidence: 94,
            pagesProcessed: 1
          };
        };

        const result = await TextExtractionService.extract({
          buffer: imgBuffer,
          mimeType: 'image/png',
          filename: 'certificate.png'
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.sourceType, EXTRACTION_SOURCES.OCR_IMAGE);
        assert.strictEqual(result.confidence, 94);
        assert.ok(result.text.includes('CERTIFICATE OF MERIT'));
      } finally {
        TextExtractionService.extractImageTextWithOCR = originalOcr;
      }
    });

    it('X1.4 OCR technical failure: Separates TEXT_EXTRACTION_FAILED from evidence rejection', async () => {
      const imgBuffer = Buffer.from('corrupt-image-data');
      const originalOcr = TextExtractionService.extractImageTextWithOCR;
      try {
        TextExtractionService.extractImageTextWithOCR = async () => {
          throw new Error('Tesseract worker crashed with memory error');
        };

        const result = await TextExtractionService.extract({
          buffer: imgBuffer,
          mimeType: 'image/jpeg',
          filename: 'corrupt.jpg'
        });

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.errorCode, REASON_CODES.TEXT_EXTRACTION_FAILED);
        assert.ok(result.errorMessage.includes('Tesseract worker crashed'));
      } finally {
        TextExtractionService.extractImageTextWithOCR = originalOcr;
      }
    });

    it('X1.5 Weak/Garbage OCR output: Assesses quality and marks isUsable as false', () => {
      const garbageOcr = '1 1 I l | 0 _ - / \\ !';
      const quality = TextExtractionService.assessQuality(garbageOcr);

      assert.strictEqual(quality.isUsable, false);
      assert.strictEqual(quality.meaningfulWordCount, 0);
      assert.ok(quality.alphaRatio < 0.3);
    });

    it('X1.6 Text normalization handles excessive spacing, zero-width spaces, and control chars', () => {
      const rawText = 'CERTIFICATE   OF    COMPLETION\r\n\r\n\r\nThis   is  to\u200B certify  that\u0000 Mridul.';
      const normalized = TextExtractionService.normalizeText(rawText);

      assert.strictEqual(normalized.includes('   '), false);
      assert.strictEqual(normalized.includes('\u200B'), false);
      assert.strictEqual(normalized.includes('\u0000'), false);
      assert.ok(normalized.includes('CERTIFICATE OF COMPLETION'));
    });
  });

  // =========================================================================
  // PART X2: VALID CERTIFICATE TESTS
  // =========================================================================
  describe('X2: Valid Certificate Evidence Evaluation', () => {
    it('X2.1 Participation Certificate: Validated as VALID_EVIDENCE', () => {
      const text = `
        DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
        GOVERNMENT ENGINEERING COLLEGE
        CERTIFICATE OF PARTICIPATION
        This is to certify that Mridul Narayanan has participated in the National Level Workshop
        on Deep Learning and Neural Networks held on 14th and 15th March 2024.
        Dr. K. S. Nair, Head of Department
        Prof. A. R. Varma, Principal
      `;
      const result = EvidenceValidator.validate({ text, filename: 'participation.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.PARTICIPATION_CERTIFICATE);
      assert.strictEqual(result.checks.completedActivityEvidence, true);
      assert.strictEqual(result.checks.participantIdentified, true);
      assert.strictEqual(result.checks.issuerIdentified, true);
    });

    it('X2.2 Completion Certificate: Validated as VALID_EVIDENCE', () => {
      const text = `
        KERALA STATE ELECTRONICS DEVELOPMENT CORPORATION LIMITED (KELTRON)
        CERTIFICATE OF COMPLETION
        This is to certify that T. S. Mridul Narayanan has successfully completed
        the Internship Program in Embedded Systems & IoT from 01-06-2023 to 15-06-2023.
        Authorized Signatory, Keltron Knowledge Services Group
      `;
      const result = EvidenceValidator.validate({ text, filename: 'internship_keltron.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.COMPLETION_CERTIFICATE);
      assert.strictEqual(result.checks.completedActivityEvidence, true);
      assert.strictEqual(result.reasonCode, REASON_CODES.VERIFIED_ACTIVITY_EVIDENCE);
    });

    it('X2.3 Achievement & Merit Certificate: Validated as VALID_EVIDENCE', () => {
      const text = `
        ANNUAL TECH FEST - ADVAY 2024
        CERTIFICATE OF MERIT
        Awarded to Mridul Narayanan for securing FIRST PRIZE in the 24-Hour Hackathon
        conducted on 20th February 2024.
        Convener: Dr. Radhakrishnan
      `;
      const result = EvidenceValidator.validate({ text, filename: 'hackathon_merit.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);
      assert.ok([DOCUMENT_PURPOSES.ACHIEVEMENT_CERTIFICATE, DOCUMENT_PURPOSES.MERIT_CERTIFICATE].includes(result.documentPurpose));
      assert.strictEqual(result.checks.achievementIdentified, true);
    });
  });

  // =========================================================================
  // PART X3: PROMOTIONAL / CAMPAIGN / NON-EVIDENCE MATERIAL
  // =========================================================================
  describe('X3: Promotional Material & Posters (Real Production Bug Cases)', () => {
    it('X3.1 Workshop promotional poster: Rejects as INVALID_EVIDENCE (NO_COMPLETED_ACTIVITY_EVIDENCE)', () => {
      const text = `
        IEEE STUDENT BRANCH PRESENTS
        HANDS-ON WORKSHOP ON BLOCKCHAIN & WEB3
        DATE: 28th October 2024
        VENUE: Computer Lab 2
        REGISTER NOW! Limited Seats Available!
        Registration link: bit.ly/ieee-workshop
        Entry Fee: Rs. 150 per head
        Contact: 9876543210
        All are welcome!
      `;
      const result = EvidenceValidator.validate({ text, filename: 'workshop_poster.jpg' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.POSTER);
      assert.ok([REASON_CODES.PROMOTIONAL_MATERIAL, REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE].includes(result.reasonCode));
      assert.strictEqual(result.checks.completedActivityEvidence, false);
    });

    it('X3.2 Political / Student Union Campaign Poster (SFI / KSU Case): Rejects as INVALID_EVIDENCE without political bias', () => {
      // Must reject because it is campaign material / propaganda, NOT because of the letters 'SFI'
      const text = `
        COLLEGE UNION ELECTIONS 2024-25
        STUDENTS FEDERATION OF INDIA (SFI)
        VOTE FOR SFI! JOIN THE MARCH!
        Comrades, unite against privatization of public education!
        General Secretary Candidate: Comrade Rahul
        University Union Councillor: Comrade Sneha
        Victory to the Student Movement!
      `;
      const result = EvidenceValidator.validate({ text, filename: 'union_campaign.jpg' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.CAMPAIGN_MATERIAL);
      assert.strictEqual(result.reasonCode, REASON_CODES.CAMPAIGN_MATERIAL);
      assert.strictEqual(result.checks.completedActivityEvidence, false);
    });

    it('X3.3 Hackathon announcement banner: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        CALL FOR CODERS! HACK-A-BIT 2024
        Register before October 10th.
        Win cash prizes up to 50,000 INR!
        Scan QR Code to register your team.
        Food and accommodation will be provided.
        Save the date: 15-16 October.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'hackathon_flyer.png' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.ok([DOCUMENT_PURPOSES.POSTER, DOCUMENT_PURPOSES.FLYER_OR_ADVERTISEMENT].includes(result.documentPurpose));
      assert.strictEqual(result.reasonCode, REASON_CODES.PROMOTIONAL_MATERIAL);
    });

    it('X3.4 Event invitation: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        INVITATION
        You are cordially invited to the Inauguration Ceremony of the Robotics Club.
        Chief Guest: Shri. Ramesh IPS
        Date: 12th August 2024, 10:00 AM
        Venue: College Auditorium
        Presided by: Principal
      `;
      const result = EvidenceValidator.validate({ text, filename: 'invitation.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.ok([DOCUMENT_PURPOSES.POSTER, DOCUMENT_PURPOSES.FLYER_OR_ADVERTISEMENT].includes(result.documentPurpose));
    });
  });

  // =========================================================================
  // PART X4: PRE-EVENT DOCUMENTS (REGISTRATION, TICKETS, RECEIPTS)
  // =========================================================================
  describe('X4: Pre-Event Documents & Transaction Proofs', () => {
    it('X4.1 Registration Confirmation: Rejects as INVALID_EVIDENCE (Proves registration, NOT completion)', () => {
      const text = `
        REGISTRATION CONFIRMATION
        Dear Mridul Narayanan,
        Thank you for registering for the National Conference on Cyber Security.
        Registration ID: CONF-2024-8891
        Event Date: 25th November 2024
        Your seat is confirmed. Please show this email at the registration desk.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'registration_email.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.ok([DOCUMENT_PURPOSES.REGISTRATION_OR_TICKET, DOCUMENT_PURPOSES.UNRELATED_DOCUMENT].includes(result.documentPurpose));
      assert.ok([REASON_CODES.PRE_EVENT_DOCUMENT, REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE, REASON_CODES.UNRELATED_DOCUMENT].includes(result.reasonCode));
    });

    it('X4.2 Hall Ticket / Exam Admit Card: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY
        HALL TICKET / ADMIT CARD
        Student Name: Mridul Narayanan
        Register No: TRV21CS045
        Exam: B.Tech S6 Examination May 2024
        Instructions to candidates: Bring ID card. No electronic gadgets.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'hall_ticket.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.REGISTRATION_OR_TICKET);
      assert.strictEqual(result.reasonCode, REASON_CODES.PRE_EVENT_DOCUMENT);
    });

    it('X4.3 Payment Receipt / Event Fee Receipt: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        PAYMENT RECEIPT
        Transaction ID: TXN998234871
        Paid To: TechFest Organizing Committee
        Amount: INR 450.00
        Status: Payment Successful
        Payer Name: Mridul Narayanan
        Date: 04/02/2024
      `;
      const result = EvidenceValidator.validate({ text, filename: 'receipt.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.ok([DOCUMENT_PURPOSES.REGISTRATION_OR_TICKET, DOCUMENT_PURPOSES.PAYMENT_RECEIPT].includes(result.documentPurpose));
      assert.strictEqual(result.reasonCode, REASON_CODES.PRE_EVENT_DOCUMENT);
    });
  });

  // =========================================================================
  // PART X5: UNRELATED DOCUMENTS (NOTES, TIMETABLES, RESUMES)
  // =========================================================================
  describe('X5: Unrelated Documents & Academic Artifacts', () => {
    it('X5.1 Academic College Lecture Notes: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        MODULE 3: DATABASE MANAGEMENT SYSTEMS
        Relational Model & Normalization
        First Normal Form (1NF): A relation is in 1NF if and only if all underlying domains contain atomic values only.
        Second Normal Form (2NF): A relation is in 2NF if it is in 1NF and no non-prime attribute is dependent on any proper subset of any candidate key.
        Third Normal Form (3NF) and BCNF definitions.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'dbms_module3_notes.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.ACADEMIC_NOTES);
      assert.strictEqual(result.reasonCode, REASON_CODES.ACADEMIC_NOTES);
    });

    it('X5.2 Resume / Curriculum Vitae: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        CURRICULUM VITAE
        T S Mridul Narayanan
        Email: mridul@example.com | Phone: +91 9876543210
        EDUCATION:
        B.Tech Computer Science, Government Engineering College, GPA: 8.9
        SKILLS: Python, JavaScript, Docker, Git
        PROJECTS: KTU Activity Point Manager
      `;
      const result = EvidenceValidator.validate({ text, filename: 'mridul_resume.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.UNRELATED_DOCUMENT);
    });

    it('X5.3 Weekly Timetable: Rejects as INVALID_EVIDENCE', () => {
      const text = `
        DEPARTMENT OF CSE - CLASS TIMETABLE - SEMESTER 6
        Monday: 09:00 OS, 10:00 CD, 11:00 CN, 01:30 Mini Project Lab
        Tuesday: 09:00 CN, 10:00 OS, 11:00 Elective I
        Wednesday: Microprocessor Lab
      `;
      const result = EvidenceValidator.validate({ text, filename: 'timetable.pdf' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.UNRELATED_DOCUMENT);
    });
  });

  // =========================================================================
  // PART X6: UNKNOWN DOCUMENT TYPE GENERALIZATION TEST (CRITICAL!)
  // =========================================================================
  describe('X6: Generalization to Unknown Documents (Evidence-First, Not Blacklist-Only)', () => {
    it('X6.1 Completely novel document without blacklist words: Rejects because it lacks completed activity proof', () => {
      // Document that contains NONE of our negative keywords (no 'poster', no 'register', no 'vote', no 'sfi', no 'notes')
      // but is merely minutes of a meeting.
      const text = `
        MINUTES OF THE 14th DEPARTMENTAL ADVISORY BOARD MEETING
        Date: 14 January 2024
        Members present: Prof. Sharma, Dr. Menon, Er. Varma.
        Item 1: Review of curriculum gaps.
        Item 2: Lab equipment procurement status.
        The committee resolved that 10 new FPGA development kits shall be requisitioned.
        Meeting adjourned at 4:30 PM.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'meeting_minutes.pdf' });

      // Invariant: Must NOT be VALID_EVIDENCE because it proves NO student completed activity!
      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.checks.completedActivityEvidence, false);
      assert.strictEqual(result.reasonCode, REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE);
    });

    it('X6.2 Synthetic arbitrary prose: Does not classify as valid evidence', () => {
      const text = `
        The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet,
        consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
      `;
      const result = EvidenceValidator.validate({ text, filename: 'lorem.pdf' });

      assert.notStrictEqual(result.evidenceStatus, EVIDENCE_STATUS.VALID_EVIDENCE);
      assert.strictEqual(result.checks.completedActivityEvidence, false);
    });
  });

  // =========================================================================
  // PART X7: CERTIFICATE TEMPLATE TEST
  // =========================================================================
  describe('X7: Certificate Template Protection', () => {
    it('X7.1 Does NOT trust the word certificate when placeholders are present', () => {
      const text = `
        CERTIFICATE OF APPRECIATION
        This is proudly presented to [STUDENT NAME HERE]
        For outstanding participation in [EVENT NAME GOES HERE]
        Date: DD/MM/YYYY
        Signature: ________________
        (Download this certificate template from Canva)
      `;
      const result = EvidenceValidator.validate({ text, filename: 'certificate_template.png' });

      assert.strictEqual(result.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(result.documentPurpose, DOCUMENT_PURPOSES.CERTIFICATE_TEMPLATE);
      assert.strictEqual(result.reasonCode, REASON_CODES.CERTIFICATE_TEMPLATE);
      assert.strictEqual(result.checks.participantIdentified, false);
    });
  });

  // =========================================================================
  // PART X8: STUDENT IDENTITY ATTRIBUTION TESTS
  // =========================================================================
  describe('X8: Student Identity Attribution & Realistic Variations', () => {
    const loggedInStudent = {
      name: 'T S Mridul Narayanan',
      registerNumber: 'TRV21CS045'
    };

    it('X8.1 Matches exact name and initial variations safely', () => {
      // Variations that should all resolve to a valid match
      const variations = [
        'T S Mridul Narayanan',
        'T.S. MRIDUL NARAYANAN',
        'Mridul Narayanan T S',
        'Mridul Narayanan',
        'T. S. Mridul Narayanan'
      ];

      for (const nameOnDoc of variations) {
        const attribution = StudentAttribution.attributeParticipant({
          documentText: `Certificate awarded to ${nameOnDoc} for workshop participation.`,
          extractedParticipantName: nameOnDoc,
          studentUser: { name: loggedInStudent.name },
          studentProfile: { registerNumber: loggedInStudent.registerNumber }
        });

        assert.strictEqual(
          attribution.isAttributed,
          true,
          `Failed to attribute valid variation: "${nameOnDoc}"`
        );
        assert.ok(
          ['MATCHED', 'FULL_MATCH', 'INITIALS_EXPANDED', 'PERMUTATION_MATCH'].includes(attribution.status || attribution.matchStatus)
        );
      }
    });

    it('X8.2 Matches by KTU Register Number when printed on the certificate', () => {
      const text = 'This certifies that student bearing Reg No: TRV21CS045 has won First Prize.';
      const attribution = StudentAttribution.attributeParticipant({
        documentText: text,
        extractedParticipantName: null,
        studentUser: { name: loggedInStudent.name },
        studentProfile: { registerNumber: loggedInStudent.registerNumber }
      });

      assert.strictEqual(attribution.isAttributed, true);
      assert.strictEqual(attribution.status, 'MATCHED');
    });

    it('X8.3 Rejects certificate issued to a DIFFERENT student as CLEAR_MISMATCH', () => {
      const text = 'This certificate is awarded to Ananya Sharma from Model Engineering College for participation in Hackathon.';
      const attribution = StudentAttribution.attributeParticipant({
        documentText: text,
        extractedParticipantName: 'Ananya Sharma',
        studentUser: { name: loggedInStudent.name },
        studentProfile: { registerNumber: loggedInStudent.registerNumber }
      });

      assert.strictEqual(attribution.isAttributed, false);
      assert.strictEqual(attribution.matchStatus, 'CLEAR_MISMATCH');
      assert.strictEqual(attribution.reasonCode, REASON_CODES.STUDENT_MISMATCH);
    });

    it('X8.4 Detects template placeholders during attribution', () => {
      const attribution = StudentAttribution.attributeParticipant({
        documentText: 'Presented to [Insert Participant Name]',
        extractedParticipantName: '[Insert Participant Name]',
        studentUser: { name: loggedInStudent.name },
        studentProfile: { registerNumber: loggedInStudent.registerNumber }
      });

      assert.strictEqual(attribution.isAttributed, false);
      assert.strictEqual(attribution.matchStatus, 'TEMPLATE');
      assert.strictEqual(attribution.reasonCode, REASON_CODES.CERTIFICATE_TEMPLATE);
    });
  });

  // =========================================================================
  // PART X9: CRITICAL BOUNDARY TESTS & ABSOLUTE INVARIANTS
  // =========================================================================
  describe('X9: Critical Pipeline Boundary Invariants', () => {
    it('X9.1 ABSOLUTE INVARIANT: PointCalculationEngine is NEVER invoked if evidenceStatus !== VALID_EVIDENCE', async () => {
      let pointEngineWasCalled = false;
      const originalCalculate = PointCalculationEngine.calculatePoints;
      PointCalculationEngine.calculatePoints = (...args) => {
        pointEngineWasCalled = true;
        return originalCalculate.apply(PointCalculationEngine, args);
      };

      try {
        // Mock a certificate document that fails evidence validation (Poster)
        const mockCert = {
          _id: '507f1f77bcf86cd799439011',
          userId: '507f191e810c19729de860ea',
          originalFilename: 'sfi_campaign_poster.jpg',
          storageKey: 'test/storage/key',
          fileHash: 'abcdef123456',
          mimeType: 'image/jpeg',
          fileSizeBytes: 50000,
          processingStatus: PROCESSING_STATUS.PROCESSING,
          save: async function () { return this; }
        };

        // Create a mocked pipeline with an in-memory storage and mock extractor returning poster text
        const pipeline = new CertificateProcessingPipeline();

        // Stub TextExtractionService.extract
        const origExtract = TextExtractionService.extract;
        TextExtractionService.extract = async () => ({
          success: true,
          sourceType: EXTRACTION_SOURCES.OCR_IMAGE,
          text: 'VOTE FOR SFI! Student Union Election Rally 2024! Comrades unite! Venue: Auditorium.',
          confidence: 0.95,
          quality: { isUsable: true, wordCount: 15, alphaRatio: 0.9, noiseRatio: 0.05 },
          warnings: []
        });

        // Mock Storage getCertificate
        const { certificateStorage } = await import('../src/services/storage/CertificateStorageService.js');
        const origGetCert = certificateStorage.getCertificate;
        certificateStorage.getCertificate = async () => Buffer.from('mock-bytes');

        // Mock DuplicateDetector
        const { DuplicateDetector } = await import('../src/services/pipeline/duplicateDetector.js');
        const origDup = DuplicateDetector.checkExactFileDuplicate;
        DuplicateDetector.checkExactFileDuplicate = async () => ({ isDuplicate: false });

        // Mock User & StudentProfile lookup
        const { User } = await import('../src/models/User.js');
        const { StudentProfile } = await import('../src/models/StudentProfile.js');
        const origFindUser = User.findById;
        const origFindProfile = StudentProfile.findOne;

        User.findById = async () => ({
          _id: '507f191e810c19729de860ea',
          name: 'T S Mridul Narayanan'
        });
        StudentProfile.findOne = async () => ({
          userId: '507f191e810c19729de860ea',
          registerNumber: 'TRV21CS045',
          scheme: '2019',
          entryType: 'regular',
          ruleVersion: '2019-v1',
          requiredPoints: 100,
          maximumPoints: 100
        });

        try {
          const processed = await pipeline.process(mockCert);

          // Assertions
          assert.strictEqual(pointEngineWasCalled, false, 'CRITICAL FAILURE: PointCalculationEngine was called on non-valid evidence!');
          assert.strictEqual(processed.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
          assert.strictEqual(processed.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
          assert.strictEqual(processed.finalPoints, 0);
          assert.strictEqual(processed.basePoints, 0);
        } finally {
          TextExtractionService.extract = origExtract;
          certificateStorage.getCertificate = origGetCert;
          DuplicateDetector.checkExactFileDuplicate = origDup;
          User.findById = origFindUser;
          StudentProfile.findOne = origFindProfile;
        }
      } finally {
        PointCalculationEngine.calculatePoints = originalCalculate;
      }
    });

    it('X9.2 ABSOLUTE INVARIANT: OCR crash results in TEXT_EXTRACTION_FAILED and point engine is NOT invoked', async () => {
      let pointEngineWasCalled = false;
      const originalCalculate = PointCalculationEngine.calculatePoints;
      PointCalculationEngine.calculatePoints = (...args) => {
        pointEngineWasCalled = true;
        return originalCalculate.apply(PointCalculationEngine, args);
      };

      try {
        const mockCert = {
          _id: '507f1f77bcf86cd799439012',
          userId: '507f191e810c19729de860eb',
          originalFilename: 'crashed_cert.jpg',
          storageKey: 'test/storage/key2',
          fileHash: 'crashed123',
          mimeType: 'image/jpeg',
          fileSizeBytes: 50000,
          processingStatus: PROCESSING_STATUS.PROCESSING,
          save: async function () { return this; }
        };

        const pipeline = new CertificateProcessingPipeline();

        const origExtract = TextExtractionService.extract;
        TextExtractionService.extract = async () => ({
          success: false,
          errorCode: REASON_CODES.TEXT_EXTRACTION_FAILED,
          errorMessage: 'Tesseract worker segmentation fault'
        });

        const { certificateStorage } = await import('../src/services/storage/CertificateStorageService.js');
        const origGetCert = certificateStorage.getCertificate;
        certificateStorage.getCertificate = async () => Buffer.from('mock-bytes');

        const { DuplicateDetector } = await import('../src/services/pipeline/duplicateDetector.js');
        const origDup = DuplicateDetector.checkExactFileDuplicate;
        DuplicateDetector.checkExactFileDuplicate = async () => ({ isDuplicate: false });

        const { User } = await import('../src/models/User.js');
        const { StudentProfile } = await import('../src/models/StudentProfile.js');
        const origFindUser = User.findById;
        const origFindProfile = StudentProfile.findOne;

        User.findById = async () => ({ _id: '507f191e810c19729de860eb', name: 'Mridul' });
        StudentProfile.findOne = async () => ({ userId: '507f191e810c19729de860eb', registerNumber: 'TRV21CS045' });

        try {
          const processed = await pipeline.process(mockCert);

          assert.strictEqual(pointEngineWasCalled, false);
          assert.strictEqual(processed.processingStatus, PROCESSING_STATUS.FAILED);
          assert.strictEqual(processed.evidenceReasonCode, REASON_CODES.TEXT_EXTRACTION_FAILED);
          assert.strictEqual(processed.finalPoints, 0);
        } finally {
          TextExtractionService.extract = origExtract;
          certificateStorage.getCertificate = origGetCert;
          DuplicateDetector.checkExactFileDuplicate = origDup;
          User.findById = origFindUser;
          StudentProfile.findOne = origFindProfile;
        }
      } finally {
        PointCalculationEngine.calculatePoints = originalCalculate;
      }
    });

    it('X9.3 Distinction: VALID_EVIDENCE but 0 points under KTU rules vs INVALID_EVIDENCE', () => {
      // 1. Valid certificate for an event that doesn't qualify under KTU 2024 scheme (e.g. 7-day internship when 10 days required)
      const validCertFacts = {
        certificateTitle: 'Certificate of Internship in Machine Learning',
        activityCategory: 'Industrial Training / Internship',
        subcategory: 'Industrial Training',
        eventName: '7-Day ML Internship',
        organizer: 'TechCorp',
        duration: '7 Days',
        certificateDate: '2024-07-15',
        isCertificate: true,
        documentType: 'certificate'
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
        extractedFacts: validCertFacts,
        existingCertificates: []
      });

      // Point engine evaluated it, and determined 0 points due to rule constraints (Subactivity 2.20 min 2 weeks)
      assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
      assert.strictEqual(result.finalPoints, 0);
      assert.ok((result.statusReason || result.reason || '').includes('minimum of 2 weeks or 10 working days'));

      // 2. In contrast, an INVALID_EVIDENCE document never has a matched KTU rule or rule evaluation
      const invalidValidation = EvidenceValidator.validate({
        text: 'Join our WhatsApp group for coding tips! Register now!',
        filename: 'whatsapp_promo.png'
      });
      assert.strictEqual(invalidValidation.evidenceStatus, EVIDENCE_STATUS.INVALID_EVIDENCE);
      assert.strictEqual(invalidValidation.reasonCode, REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE);
    });
  });

});
