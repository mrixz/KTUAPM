import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DocumentValidator } from '../src/services/pipeline/documentValidator.js';
import { GeminiCertificateAnalyzer } from '../src/services/ai/GeminiCertificateAnalyzer.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { PROCESSING_STATUS } from '../src/config/constants.js';

describe('OCR/ML Classification & Document Integrity Test Suite', () => {

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

  const analyzer = new GeminiCertificateAnalyzer();

  // TEST 1: Valid workshop certificate
  test('TEST 1: Valid workshop certificate is accepted with positive points', async () => {
    const text = `
      APJ Abdul Kalam Technological University
      College of Engineering Trivandrum
      Department of Computer Science and Engineering
      
      CERTIFICATE OF PARTICIPATION
      This is to certify that Mr. Rahul Sharma (KTUID: TRV21CS045), student of Semester 5,
      has successfully completed and actively participated in the 3-day Workshop on
      "Applied Deep Learning & Generative AI" held from 14th to 16th October 2023.
      
      Dr. K. S. Kumar, Coordinator          Dr. M. Joseph, Principal
      Certificate ID: CET-CS-2023-W104
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'workshop_cert.pdf' });
    assert.strictEqual(validation.isValidCertificate, true);
    assert.strictEqual(validation.documentType, 'certificate');
    assert.ok(validation.confidence >= 0.70);

    const facts = await analyzer.analyze({ text, filename: 'workshop_cert.pdf' });
    assert.strictEqual(facts.isCertificate, true);
    assert.strictEqual(facts.activityCategory, 'Professional Self-Initiatives');
    assert.strictEqual(facts.subcategory, 'Workshop');

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.ok(result.finalPoints > 0, 'Expected positive points for valid workshop certificate');
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
  });

  // TEST 2: Workshop event poster
  test('TEST 2: Workshop event poster is rejected as non-certificate with 0 points', async () => {
    const text = `
      COLLEGE OF ENGINEERING TRIVANDRUM
      IEEE Student Branch Proudly Presents
      
      ONE DAY HANDS-ON WORKSHOP ON DOCKER & KUBERNETES
      
      Date: 25th November 2023
      Time: 9:30 AM to 4:30 PM
      Venue: Seminar Hall 2, Dept of CSE
      
      Keynote Speaker: Er. Anand V., Lead DevOps Architect
      
      Registration Fee: Rs. 150/- per participant
      Scan the QR Code to Register Now!
      Registration Link: bit.ly/cet-docker-2023
      Limited Seats! All are welcome.
      For queries contact: Arjun (9876543210)
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'docker_workshop_poster.jpg' });
    assert.strictEqual(validation.isValidCertificate, false);
    assert.strictEqual(validation.documentType, 'poster_or_announcement');
    assert.strictEqual(validation.confidence, 0);

    const facts = await analyzer.analyze({ text, filename: 'docker_workshop_poster.jpg' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0, 'Posters must strictly receive 0 points');
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
    assert.strictEqual(result.categoryName, 'unclassified');
  });

  // TEST 3: SFI poster
  test('TEST 3: SFI political poster is rejected as non-certificate with 0 points', async () => {
    const text = `
      STUDENTS FEDERATION OF INDIA (SFI)
      Trivandrum District Committee
      
      INQUILAB ZINDABAD!
      
      Area Conference & Youth Leadership Convention 2023
      Theme: Defend Public Education, Fight Against Fascism
      
      Join hands with the comrades!
      Venue: AKG Memorial Hall, Palayam
      Date: 12th December 2023, 10:00 AM
      
      Chief Guest: Com. P. Rajesh, All India President, SFI
      Comrades, be there to make this conference a historic success!
      
      SFI College Unit
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'sfi_convention_poster.png' });
    assert.strictEqual(validation.isValidCertificate, false);
    assert.strictEqual(validation.documentType, 'political_or_student_org_poster');
    assert.strictEqual(validation.confidence, 0);

    const facts = await analyzer.analyze({ text, filename: 'sfi_convention_poster.png' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0, 'SFI posters must strictly receive 0 points');
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
  });

  // TEST 4: Generic political/student-organization poster
  test('TEST 4: Generic student-union election campaign material is rejected with 0 points', async () => {
    const text = `
      COLLEGE UNION ELECTION 2023-2024
      KERALA STUDENTS UNION (KSU)
      
      Vote for Dynamic Leadership!
      Vote for Ballot No. 2
      
      Comrades and Friends, vote for Priya Nair for General Secretary!
      For vibrant campus life, academic reforms, and student rights.
      
      Unit General Body Meeting: Tuesday 4 PM at Quadrangle
      KSU Unit Committee
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'ksu_election_flyer.jpg' });
    assert.strictEqual(validation.isValidCertificate, false);
    assert.strictEqual(validation.documentType, 'political_or_student_org_poster');

    const facts = await analyzer.analyze({ text, filename: 'ksu_election_flyer.jpg' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0);
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
  });

  // TEST 5: Unrelated image (menu / meme / general photo)
  test('TEST 5: Unrelated image with non-certificate text receives 0 points and unclassified status', async () => {
    const text = `
      Cafe Coffee Day
      Espresso - Rs. 90
      Cappuccino - Rs. 120
      Chicken Burger with Fries - Rs. 180
      Cold Coffee - Rs. 110
      Thank you for visiting! Have a wonderful day.
      WiFi Password: coffeehouse2023
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'cafe_receipt.jpg' });
    assert.strictEqual(validation.isValidCertificate, false);

    const facts = await analyzer.analyze({ text, filename: 'cafe_receipt.jpg' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0);
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
    assert.strictEqual(result.categoryName, 'unclassified');
  });

  // TEST 6: Low-quality or blank image
  test('TEST 6: Low-quality or blank image returns unclassified and 0 points rather than guessing', async () => {
    const text = `
      ... ... .. 
      xyz 123
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'blurry_scan.png' });
    assert.strictEqual(validation.isValidCertificate, false);
    assert.strictEqual(validation.documentType, 'blank_or_low_text');

    const facts = await analyzer.analyze({ text, filename: 'blurry_scan.png' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0);
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
  });

  // TEST 7: Valid NPTEL/MOOC certificate
  test('TEST 7: Valid NPTEL / MOOC course certificate correctly awards points per KTU rules', async () => {
    const text = `
      National Programme on Technology Enhanced Learning (NPTEL)
      A Project funded by MoE, Government of India
      
      SWAYAM-NPTEL CERTIFICATE OF COMPLETION
      This certificate is awarded to
      ANAND KRISHNAN (Roll No: NPTEL23CS89S4521098)
      for successfully completing the 12 week course
      "Deep Learning and Neural Networks"
      with a consolidated score of 84% (Elite + Silver).
      
      Prof. Andrew Thangaraj, NPTEL Coordinator, IIT Madras
      July - October 2023
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'nptel_elite_cert.pdf' });
    assert.strictEqual(validation.isValidCertificate, true);
    assert.strictEqual(validation.documentType, 'certificate');

    const facts = await analyzer.analyze({ text, filename: 'nptel_elite_cert.pdf' });
    assert.strictEqual(facts.isCertificate, true);
    assert.strictEqual(facts.activityCategory, 'Professional Self-Initiatives');
    assert.strictEqual(facts.subcategory, 'MOOC');

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    // In KTU 2019 regulation, a 12-week MOOC awards 50 points
    assert.strictEqual(result.basePoints, 50);
    assert.strictEqual(result.finalPoints, 50);
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.COUNTED);
  });

  // TEST 8: Document with word "workshop" only in incidental / unrelated text
  test('TEST 8: Document mentioning "workshop" in incidental text does NOT receive points without certificate evidence', async () => {
    const text = `
      AUTOMOBILE MECHANICAL WORKSHOP AND SERVICE GARAGE
      Kaloor, Kochi, Kerala - 682017
      
      Tax Invoice / Cash Receipt
      Customer: Mr. Suresh
      Vehicle: Maruti Swift KL-07-CD-4512
      Service Details: Oil change, brake pad replacement, general service at our workshop.
      Total Paid: Rs. 4,250/-
      Payment Mode: UPI
    `;

    const validation = DocumentValidator.validateDocument({ text, filename: 'garage_bill.pdf' });
    assert.strictEqual(validation.isValidCertificate, false);

    const facts = await analyzer.analyze({ text, filename: 'garage_bill.pdf' });
    assert.strictEqual(facts.isCertificate, false);

    const result = PointCalculationEngine.calculatePoints({
      studentProfile: mockProfile2019,
      extractedFacts: facts
    });

    assert.strictEqual(result.finalPoints, 0, 'Incidental mention of workshop must not receive points');
    assert.strictEqual(result.processingStatus, PROCESSING_STATUS.NOT_ELIGIBLE);
  });
});
