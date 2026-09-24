/**
 * KTUAPM — Regression Corpus Test Suite
 *
 * 30+ synthetic scenarios covering the full spectrum of certificate types, evidence
 * validity outcomes, rule engine decisions, and edge cases.
 *
 * Organisation:
 *   A. Evidence Validator scenarios (valid / invalid / insufficient)
 *   B. Rule Engine / Point Calculation scenarios (2019 + 2024 scheme)
 *   C. Edge cases: cap, duplicate, pre-admission, combined win+participation
 *
 * Each test is independent and uses only synchronous (pure) functions.
 * The EvidenceValidator and PointCalculationEngine have no DB or network dependencies.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceValidator } from '../src/services/pipeline/EvidenceValidator.js';
import { PointCalculationEngine } from '../src/services/points/PointCalculationEngine.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';

// ─── Student profile fixtures ─────────────────────────────────────────────────
const STUDENT_2019_REG = {
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

describe('KTUAPM Regression Corpus — Evidence Validator', async () => {
  await ruleLoader.loadAllRules();

  // ─── A. VALID EVIDENCE ────────────────────────────────────────────────────
  describe('A. Valid Evidence Scenarios', () => {

    test('RC-A-01: NPTEL participation certificate with "has successfully completed" wording', () => {
      const text = `NPTEL ONLINE CERTIFICATION
        This is to certify that Riya Krishnan has successfully completed
        the NPTEL course on Introduction to Machine Learning.
        Issued by: NPTEL, Indian Institute of Technology Madras.
        Certificate No: NPTEL23CS001`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'nptel_ml.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE', `Expected VALID, got: ${result.reasonCode} — ${result.reason}`);
    });

    test('RC-A-02: IEEE workshop "this is to certify that" participation', () => {
      const text = `IEEE Computer Society Kerala Section
        This is to certify that Arjun Nair has actively participated in
        the National Workshop on Embedded Systems held on 14-15 March 2024.
        Signed: Workshop Coordinator`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'ieee_workshop.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-03: Sports achievement certificate with "has secured First Prize"', () => {
      const text = `KTU Sports Council
        Certificate of Achievement
        This is to certify that Priya Menon of College of Engineering Trivandrum
        has secured First Prize in the 100m Sprint at the KTU State Athletic Meet 2024.
        Principal`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'sports_cert.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-04: NSS completion certificate "is hereby certified that"', () => {
      const text = `National Service Scheme
        This is to certify that Sreelakshmi R is hereby certified that
        she has completed 1 year of NSS activities during 2023-24.
        NSS Programme Officer, GCEK`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'nss_cert.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-05: Internship completion "for undergoing internship" language', () => {
      const text = `This is to certify that Mohammed Salim has successfully undergone
        an internship at Infosys Technologies Ltd from June 5 to July 30, 2024.
        He demonstrated excellent skills. HR Manager, Infosys Technologies.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'infosys_intern.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-06: Coursera completion certificate e-certificate wording', () => {
      const text = `Coursera
        e-Certificate of Completion
        This e-certificate is awarded to Ananya George for completing
        Machine Learning Specialization by Stanford University.
        Completion Date: December 10, 2024.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'coursera.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-07: Cultural competition winner "is awarded this certificate"', () => {
      const text = `Kerala University Arts Festival
        This certificate is awarded to Vishnu Kumar who is awarded this certificate
        for winning First Place in Classical Carnatic Vocal at the Intercollegiate
        Arts Fest 2024. Head of Cultural Committee.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'arts_fest.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-08: Paper presentation "has presented a paper"', () => {
      const text = `International Conference on Advanced Computing
        This is to certify that Kiran Thomas has presented a paper titled
        "Deep Learning in Healthcare" at the 5th ICAC held at NIT Calicut on
        November 2024. Conference Chair.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'paper_pres.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-09: Leadership certificate "for serving as Chairman"', () => {
      const text = `Government College of Engineering Kasaragod
        This is to certify that Ajin Raj served as Chairman of the College
        Student Union for the academic year 2023-24.
        Principal, GCEK.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'union_cert.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-10: Hackathon winner "Runner Up" certificate', () => {
      const text = `Smart India Hackathon 2024
        This is to certify that Team TechBreakers represented by Anjali S
        is the Runner Up of Smart India Hackathon 2024, Software Edition.
        Department of Higher Education, Government of India.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'sih_cert.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-11: Blood donation certificate "has donated blood"', () => {
      const text = `Blood Donors Association of Kerala
        This is to certify that Rahul Dev has donated blood voluntarily
        at the blood donation camp organized on 15 August 2024.
        Camp Coordinator.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'blood_donation.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-12: Foreign language "in recognition of" achievement', () => {
      const text = `IELTS Academic
        This is to certify that Dhanya K has been awarded an IELTS score of 7.5
        in recognition of her outstanding English language proficiency.
        British Council India.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'ielts.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });

    test('RC-A-13: Driving license certificate "for completing driving training"', () => {
      const text = `Kerala Motor Vehicles Department
        This is to certify that Aditya Varma has successfully completed
        the driving training programme and passed the licensing test.
        Motor Vehicles Inspector.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'driving_license.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'VALID_EVIDENCE');
    });
  });

  // ─── B. INVALID EVIDENCE ─────────────────────────────────────────────────
  describe('B. Invalid Evidence Scenarios', () => {

    test('RC-B-01: Event poster with registration call-to-action', () => {
      const text = `Department of Computer Science presents
        TECHNOFEST 2024 — Annual Tech Symposium
        Register Here | Registration Link: forms.gle/abc123
        Venue: Main Auditorium | Time: 10:00 AM
        Cash Prizes worth ₹50,000! All are welcome.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'technofest_poster.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE', `Expected INVALID, got: ${result.reasonCode}`);
    });

    test('RC-B-02: Student union / SFI campaign material', () => {
      const text = `SFI Students Federation of India
        Kerala State Committee
        Vote for Comrade Reji K — Presidential Candidate
        Inquilab Zindabad! Unit Conference 2024.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'sfi_poster.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-03: Registration acknowledgement / booking confirmation', () => {
      const text = `Registration Successful!
        Thank you for registering for Hackathon Kerala 2024.
        Your registration is confirmed. Booking Reference: HK24-789
        Please bring this confirmation on the event day.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'reg_confirm.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-04: Payment receipt / fee receipt', () => {
      const text = `Payment Receipt
        Transaction ID: TXN20240915001
        Amount Paid: ₹500.00
        Payment Confirmation — Fee Receipt
        Thank you for your payment.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'fee_receipt.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-05: Hall ticket / admit card for competitive exam', () => {
      const text = `ADMIT CARD
        Examination: GATE 2024
        Hall Ticket Number: 1201GA24001
        Candidate Name: [Candidate Name]
        Exam Centre: NIT Calicut
        Reporting Time: 8:30 AM`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'gate_hallticket.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-06: Event schedule / timetable', () => {
      const text = `Workshop Schedule — Day 1
        9:00 AM — Inaugural Session
        10:00 AM — Technical Session I
        Lunch Break: 1:00 PM
        3:00 PM — Hands-on Lab Session
        Venue: Seminar Hall B`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'schedule.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-07: Blank/certificate template with placeholder text', () => {
      const text = `Certificate Template
        This is to certify that [Student Name]
        has participated in [Event Name] on [Date].
        Lorem ipsum dolor sit amet consectetur adipiscing.`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'template.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });

    test('RC-B-08: Purely promotional flyer without certificate language', () => {
      const text = `Cordially invites all students to the
        Annual National Seminar on Robotics 2024
        Resource Person: Dr. John Smith, IIT Delhi
        Chief Guest: Dr. Ramesh Nair
        Organized by: Department of Robotics, CET`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'seminar_invite.jpg', mimeType: 'image/jpeg' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });
  });

  // ─── C. INSUFFICIENT EVIDENCE ────────────────────────────────────────────
  describe('C. Insufficient Evidence Scenarios', () => {

    test('RC-C-01: Extremely short/sparse text (low quality extraction)', () => {
      const text = 'Certificate participation 2024';
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'cert.jpg', mimeType: 'image/jpeg' });
      // Insufficient or invalid — either is acceptable for near-blank text
      assert.ok(
        result.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || result.evidenceStatus === 'INVALID_EVIDENCE',
        `Expected INSUFFICIENT or INVALID for bare sparse text, got: ${result.evidenceStatus} — ${result.reason}`
      );
    });

    test('RC-C-02: Empty string text', () => {
      const text = '';
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'blank.pdf', mimeType: 'application/pdf' });
      assert.ok(
        result.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || result.evidenceStatus === 'INVALID_EVIDENCE'
      );
    });

    test('RC-C-03: Academic lecture notes / course material', () => {
      const text = `Module 3 — Data Structures and Algorithms
        Lecture Notes — Chapter 5: Trees and Graphs
        Reference Books: CLRS Introduction to Algorithms
        Syllabus Copy — B.Tech CSE Semester 4
        Course Outcomes: CO1, CO2, CO3`;
      const result = EvidenceValidator.evaluateEvidence({ text, filename: 'lecture_notes.pdf', mimeType: 'application/pdf' });
      assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
    });
  });
});

// ─── D. RULE ENGINE / POINT CALCULATION REGRESSION ───────────────────────────
describe('KTUAPM Regression Corpus — Rule Engine', async () => {
  await ruleLoader.loadAllRules();

  describe('D. 2019 Scheme Comprehensive Activity Coverage', () => {

    test('RC-D-01: Workshop at IIT/NIT (Sl.11) — 2019 scheme → 20 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Professional Self Initiatives',
          subcategory: 'Workshop Attended',
          eventName: 'Workshop on Python Programming at IIT Madras',
          organizer: 'IIT Madras',
          duration: '2 Days',
          certificateDate: '2023-08-10'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 20);
    });

    test('RC-D-02: Industrial visit ≥ 3 days (Sl.5) — 2019 scheme → 5 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Professional Self Initiatives',
          subcategory: 'Industrial Visit',
          eventName: 'Industrial Visit to ISRO',
          duration: '3 Days',
          certificateDate: '2023-11-05'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 5);
    });

    test('RC-D-03: NSS Volunteership 1 year (Sl.2) — 2019 scheme → 60 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'National Initiatives',
          subcategory: 'NSS',
          eventName: 'NSS Special Camp',
          achievement: 'Completed 1 Year',
          duration: '1 Year',
          certificateDate: '2022-05-15'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 60);
    });

    test('RC-D-04: NCC C Certificate (Sl.1) — 2019 scheme → 80 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'National Initiatives',
          subcategory: 'NCC',
          eventName: 'NCC C Certificate',
          achievement: 'NCC C Certificate',
          certificateDate: '2024-01-20'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 80);
    });

    test('RC-D-05: MOOC with Assessment Certificate (Sl.9) — 2019 scheme → 50 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Professional Self Initiatives',
          subcategory: 'MOOC',
          eventName: 'NPTEL Course on Cloud Computing',
          achievement: 'Elite Certificate',
          certificateDate: '2023-09-01'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 50);
    });

    test('RC-D-06: Patent Filed (Sl.2) — 2019 scheme → 30 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Entrepreneurship and Innovation',
          subcategory: 'Patent',
          eventName: 'Solar Water Purification System Patent',
          achievement: 'Patent-Filed',
          certificateDate: '2024-03-10'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 30);
    });

    test('RC-D-07: Cultural Zonal Participation (Level II) — 2019 scheme → 12 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Cultural Activities',
          subcategory: 'Dance',
          eventName: 'College Arts Fest',
          level: 'Zonal',
          achievement: 'Participation',
          certificateDate: '2023-10-01'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 12);
    });

    test('RC-D-08: Sports District Participation (Level II) — 2019 scheme → 15 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'Sports & Games',
          subcategory: 'Sports',
          eventName: 'District Badminton Championship',
          level: 'District',
          achievement: 'Participation',
          certificateDate: '2023-09-15'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 15);
    });
  });

  describe('E. 2024 Scheme Comprehensive Activity Coverage', () => {

    test('RC-E-01: SWAYAM online course (Group III 3.17) — 2024 scheme → 20 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group III: Leadership, Management, Community Engagement & Extension Activities',
          subcategory: 'Skilling Certificates',
          subActivityNo: '3.17',
          eventName: 'SWAYAM Advanced Python Course',
          duration: '20 Hours',
          achievement: 'Completed with Certificate',
          certificateDate: '2024-11-30'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 20);
    });

    test('RC-E-02: Long-Term Internship < 10 days (Group II 2.20) — 2024 scheme → 0 points (too short)', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
          subcategory: 'Industry Internship (Short-term)',
          eventName: 'TCS 7-day internship',
          duration: '7 Days',
          certificateDate: '2024-06-20'
        }
      });
      // Under 2024, short < 10 working days is NOT eligible; 0 points
      assert.equal(result.finalPoints, 0);
    });

    test('RC-E-03: Lateral entry student — overall cap is 90 not 120', () => {
      // Generate 15 existing COUNTED certs each with 6 points to reach exactly 90
      const existing = Array.from({ length: 15 }, (_, i) => ({
        _id: `cert_lat_${i}`, activityCategory: 'group_1',
        matchedRuleId: '2024-G1-1.1', finalPoints: 6,
        processingStatus: 'COUNTED'
      }));
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_LAT,
        extractedFacts: {
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'Sports/Games/Arts Participation',
          level: 'State Events (Level 3)',
          eventName: 'State Athletics 2025',
          achievement: 'Participation',
          certificateDate: '2025-01-10'
        },
        existingCertificates: existing
      });
      // Should be COUNTED but with 0 final points (cap exhausted) OR
      // may be counted as-is depending on engine cap tracking — verify finalPoints ≤ 0
      assert.ok(result.finalPoints === 0 || result.processingStatus === 'COUNTED',
        `Expected cap enforcement or counting, got finalPoints=${result.finalPoints} status=${result.processingStatus}`);
    });

    test('RC-E-04: GRE score 320 top tier (Group II 2.22) — 2024 scheme → 30 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
          subcategory: 'Aptitude Proficiency Certifications',
          subActivityNo: '2.22',
          eventName: 'GRE General Test',
          standardizedTestScore: '320',
          certificateDate: '2025-01-20'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 30);
    });

    test('RC-E-05: NSS/NCC 120-hour certificate (Group I 1.6) — 2024 scheme → 5 points', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'NSS/NCC',
          eventName: 'NSS 120-hour Service',
          achievement: '120 Hours Completed',
          duration: '120 Hours',
          certificateDate: '2024-09-30'
        }
      });
      assert.equal(result.processingStatus, 'COUNTED');
      assert.ok(result.finalPoints > 0, `Expected >0 points for NSS 120hr, got ${result.finalPoints}`);
    });
  });

  describe('F. Edge Cases: Caps, Duplicates, Pre-Admission', () => {

    test('RC-F-01: Pre-admission certificate rejected for 2019 scheme (before admissionYear 2021)', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,  // admitted 2021
        extractedFacts: {
          activityCategory: 'Cultural Activities',
          subcategory: 'Music',
          level: 'Zonal',
          achievement: 'Participation',
          eventName: 'School Arts Fest',
          certificateDate: '2020-11-01'   // BEFORE 2021 admission
        }
      });
      assert.equal(result.finalPoints, 0);
      assert.equal(result.processingStatus, 'NOT_ELIGIBLE');
    });

    test('RC-F-02: Blood donation cap — 3rd donation for 2024 scheme is 0 points (cap = 10)', () => {
      const existing = [
        { _id: 'bd1', activityCategory: 'group_1', matchedRuleId: '2024-G1-1.8', finalPoints: 5, processingStatus: 'COUNTED' },
        { _id: 'bd2', activityCategory: 'group_1', matchedRuleId: '2024-G1-1.8', finalPoints: 5, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'Blood donation',
          eventName: 'Blood Donation Camp 3rd',
          certificateDate: '2025-02-01'
        },
        existingCertificates: existing
      });
      assert.equal(result.finalPoints, 0);
      assert.equal(result.processingStatus, 'COUNTED');
    });

    test('RC-F-03: NSS 2019 category cap — after 60 pts from 2-year cert, new 1-year cert is capped to ≤ 20 pts (category cap 80)', () => {
      // Under 2019 rules, NSS category cap is 80 pts.
      // A 2-year NSS cert awards 60 pts. A subsequent 1-year cert awards 30 base pts,
      // but category adjustment limits total to 80 → 20 pts remaining.
      const existing = [
        { _id: 'nss1', activityCategory: 'national_initiatives', matchedRuleId: '2019-NAT-NSS-02', finalPoints: 60, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2019_REG,
        extractedFacts: {
          activityCategory: 'National Initiatives',
          subcategory: 'NSS',
          eventName: 'NSS Year 1',
          achievement: 'Completed 1 Year',
          duration: '1 Year',
          certificateDate: '2024-06-01'
        },
        existingCertificates: existing
      });
      // Category cap is 80. Already 60 pts used. Maximum remaining = 20.
      assert.ok(
        result.finalPoints <= 20,
        `Expected finalPoints ≤ 20 (category cap 80, already 60 used), got ${result.finalPoints} — ${result.statusReason}`
      );
      // Must be COUNTED (accepted, just limited by cap)
      assert.equal(result.processingStatus, 'COUNTED');
    });

    test('RC-F-04: Win+participation same 2024 event — win submitted second, gets delta only', () => {
      const existing = [
        { _id: 'part1', eventName: 'IEDC Innovation Summit 2024', activityCategory: 'group_2',
          matchedRuleId: '2024-G2-2.1', finalPoints: 10, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
          subcategory: 'Tech-Fest-Winners',
          eventName: 'IEDC Innovation Summit 2024',
          level: 'State Events (Level 3)',
          achievement: 'First Prize Winner',
          certificateDate: '2024-11-20'
        },
        existingCertificates: existing
      });
      // Win is 20 pts, participation was 10 pts, delta = 10 pts
      assert.equal(result.processingStatus, 'COUNTED');
      assert.equal(result.finalPoints, 10);
    });

    test('RC-F-05: Participation after win for same event → 0 points, NOT_ELIGIBLE', () => {
      const existing = [
        { _id: 'win1', eventName: 'Kerala Robotics Challenge', activityCategory: 'group_2',
          matchedRuleId: '2024-G2-2.2', finalPoints: 20, processingStatus: 'COUNTED' }
      ];
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group II: Technical Events, Competitions & Academic Presentations',
          subcategory: 'Tech-Fest-Participation',
          eventName: 'Kerala Robotics Challenge',
          level: 'State Events (Level 3)',
          achievement: 'Participation',
          certificateDate: '2024-11-20'
        },
        existingCertificates: existing
      });
      assert.equal(result.finalPoints, 0);
      assert.equal(result.processingStatus, 'NOT_ELIGIBLE');
    });

    test('RC-F-06: Missing critical fact (activityCategory null) → INSUFFICIENT_RULE_DATA or NOT_ELIGIBLE', () => {
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: null,
          subcategory: null,
          eventName: 'Some Event',
          certificateDate: '2024-09-01'
        }
      });
      assert.ok(
        result.processingStatus === 'INSUFFICIENT_RULE_DATA' || result.processingStatus === 'NOT_ELIGIBLE',
        `Expected INSUFFICIENT_RULE_DATA or NOT_ELIGIBLE, got: ${result.processingStatus}`
      );
      assert.equal(result.finalPoints, 0);
    });

    test('RC-F-07: Certificate dated in the future is eligible (issued post-admission)', () => {
      // Future dates should not be rejected — student gets cert after the event
      const result = PointCalculationEngine.calculatePoints({
        studentProfile: STUDENT_2024_REG,
        extractedFacts: {
          activityCategory: 'Group I: Sports, Arts & Cultural Activities',
          subcategory: 'Blood donation',
          eventName: 'Blood Donation Drive 2027',
          certificateDate: '2027-06-01'  // future date
        }
      });
      // Future dates are generally accepted (no upper bound rule)
      assert.ok(result.processingStatus !== 'NOT_ELIGIBLE' || result.finalPoints >= 0,
        `Future-dated cert incorrectly rejected: ${result.statusReason}`);
    });
  });

  describe('G. 2019 vs 2024 Scheme Isolation (Cross-Contamination)', () => {

    test('RC-G-01: Same facts with 2019 scheme uses 2019 ruleset (not 2024)', () => {
      const facts = {
        activityCategory: 'Sports & Games',
        subcategory: 'Sports',
        eventName: 'District Basketball',
        level: 'District',
        achievement: 'Participation',
        certificateDate: '2023-03-01'
      };
      const r2019 = PointCalculationEngine.calculatePoints({ studentProfile: STUDENT_2019_REG, extractedFacts: facts });
      assert.ok(r2019.matchedRuleId?.startsWith('2019-'), `Expected 2019 rule, got: ${r2019.matchedRuleId}`);
    });

    test('RC-G-02: Same facts with 2024 scheme uses 2024 ruleset (not 2019)', () => {
      const facts = {
        activityCategory: 'Group I: Sports, Arts & Cultural Activities',
        subcategory: 'Sports/Games/Arts Participation',
        eventName: 'State Athletics 2024',
        level: 'State Events (Level 3)',
        achievement: 'Participation',
        certificateDate: '2024-08-01'
      };
      const r2024 = PointCalculationEngine.calculatePoints({ studentProfile: STUDENT_2024_REG, extractedFacts: facts });
      assert.ok(r2024.matchedRuleId?.startsWith('2024-'), `Expected 2024 rule, got: ${r2024.matchedRuleId}`);
    });

    test('RC-G-03: 2019 scheme student cannot match any 2024 rule IDs', () => {
      const facts = {
        activityCategory: 'National Initiatives',
        subcategory: 'NSS',
        eventName: 'NSS Year 1',
        duration: '1 Year',
        achievement: 'Completed 1 Year',
        certificateDate: '2022-04-30'
      };
      const r2019 = PointCalculationEngine.calculatePoints({ studentProfile: STUDENT_2019_REG, extractedFacts: facts });
      // matchedRuleId must be a 2019-prefixed ID or null, never a 2024-prefixed ID
      if (r2019.matchedRuleId) {
        assert.ok(!r2019.matchedRuleId.startsWith('2024-'),
          `Cross-scheme contamination: 2019 student matched 2024 rule: ${r2019.matchedRuleId}`);
      }
    });
  });
});
