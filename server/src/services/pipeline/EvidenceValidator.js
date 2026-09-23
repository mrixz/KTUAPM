import {
  EVIDENCE_STATUS,
  REASON_CODES,
  DOCUMENT_PURPOSES
} from '../../config/constants.js';

// Affirmative declarative patterns indicating completed personal participation / award
const CERTIFICATE_DECLARATIVES = [
  /this\s+is\s+to\s+certify\s+that/i,
  /is\s+hereby\s+certified\s+that/i,
  /certifies\s+that/i,
  /certificate\s+of\s+(participation|merit|completion|achievement|appreciation|excellence|attendance|recognition)/i,
  /proudly\s+presented\s+to/i,
  /awarded\s+to/i,
  /is\s+awarded\s+this\s+certificate/i,
  /has\s+successfully\s+completed/i,
  /has\s+participated\s+in/i,
  /has\s+attended\s+(the|a)/i,
  /has\s+secured\s+(first|second|third|\d+(?:st|nd|rd|th))\s+(prize|place|position)/i,
  /in\s+recognition\s+of\s+(his|her|their)?\s*(outstanding|active|valuable)?\s*(participation|contribution|performance)/i,
  /for\s+(active|successful)?\s*(participation|completion|securing)/i,
  /has\s+presented\s+a\s+paper/i,
  /for\s+undergoing\s+(internship|training)/i,
  /successfully\s+cleared\s+the\s+assessment/i
];

// Institutional / Authority signatory markers
const ISSUER_AUTHORITY_MARKERS = [
  /\b(principal|convenor|convener|coordinator|co-ordinator|hod|head of department|director|dean|patron|authorized\s+signatory|course\s+instructor|president|secretary)\b/i,
  /\b(college\s+of\s+engineering|institute\s+of\s+technology|university|nptel|swayam|coursera|ieee|iste|csi|acm|nss|ncc|ktu)\b/i
];

// Negative Call-to-Action markers indicating an upcoming event poster or registration flyer
const POSTER_CALL_TO_ACTION_MARKERS = [
  /\b(register\s+(here|now|today)|registration\s+link|scan\s+(the\s+)?qr(\s+code)?|scan\s+to\s+register)\b/i,
  /\b(entry\s+fee|registration\s+fee|free\s+entry|free\s+registration|last\s+date\s+to\s+register|registration\s+deadline)\b/i,
  /\b(google\s+form|forms\.gle|bit\.ly|tinyurl\.com|linktr\.ee)\b/i,
  /\b(all\s+are\s+welcome|cordially\s+invites|invitation|you\s+are\s+invited|join\s+us|calling\s+all|be\s+there)\b/i,
  /\b(proudly\s+presents|cordially\s+welcomes|presents\s+a\s+one\s+day|presents\s+a\s+two\s+day|organizing\s+a|organises\s+a)\b/i,
  /\b(venue\s*:|venue\s+declared|time\s*:\s*\d{1,2}[:.]\d{2})\b/i,
  /\b(for\s+queries|for\s+details|contact\s*:|call\s+on\s*:|ph(?:one)?\s*:\s*\+?\d{8,})\b/i,
  /\b(cash\s+prizes?\s+worth|prize\s+pool|exciting\s+prizes|win\s+up\s+to)\b/i,
  /\b(resource\s+person\s*:|speaker\s*:|keynote\s+speaker\s*:|chief\s+guest\s*:)\b/i
];

// Campaign, protest, or union organizational promotional material
const CAMPAIGN_PROPAGANDA_MARKERS = [
  /\b(sfi|students?\s+federation\s+of\s+india)\b/i,
  /\b(ksu|kerala\s+students?\s+union)\b/i,
  /\b(abvp|akhil\s+bharatiya\s+vidyarthi\s+parishad)\b/i,
  /\b(msf|aisf|comrades?|inquilab|zindabad|dharna|hartal|strike|protest\s+march)\b/i,
  /\b(union\s+election|vote\s+for|ballot|presidential\s+candidate|general\s+secretary\s+candidate)\b/i,
  /\b(area\s+committee|district\s+committee|state\s+committee|unit\s+conference)\b/i
];

// Pre-event operational documents: hall tickets, registration acknowledgements, tickets, receipts
const PRE_EVENT_OPERATIONAL_MARKERS = [
  /\b(hall\s*ticket|admit\s*card|roll\s*number\s*slip|candidate\s*admit\s*card)\b/i,
  /\b(registration\s*(confirmation|acknowledged|acknowledgement|slip|successful))\b/i,
  /\b(booking\s*(confirmed|reference|details)|e-ticket|entry\s*pass|boarding\s*pass)\b/i,
  /\b(payment\s*(receipt|successful|confirmation)|tax\s*invoice|transaction\s*id|fee\s*receipt|amount\s*paid)\b/i,
  /\b(seat\s*number|exam\s*centre|reporting\s*time|examination\s*schedule)\b/i
];

// Academic curriculum / study notes / course material
const ACADEMIC_NOTES_MARKERS = [
  /\b(module\s*[1-6]|lecture\s*notes|course\s*material|syllabus\s*copy|question\s*bank|university\s*question\s*paper)\b/i,
  /\b(chapter\s*[1-9]|reference\s*books?|scheme\s*of\s*evaluation|answer\s*key|solved\s*problems)\b/i,
  /\b(curriculum\s*structure|course\s*outcomes?|program\s*outcomes?)\b/i
];

// Certificate templates or blanks
const TEMPLATE_MARKERS = [
  /\b(certificate\s+template|sample\s+certificate|insert\s+name|your\s+name\s+here|lorem\s+ipsum)\b/i,
  /\[\s*(student|participant|your|recipient)?\s*name\s*\]/i,
  /\[\s*event\s*name\s*\]/i,
  /\[\s*date\s*\]/i
];

export class EvidenceValidator {
  /**
   * Alias for evaluateEvidence
   */
  static validate(params) {
    return this.evaluateEvidence(params);
  }

  /**
   * Evaluate whether extracted text and metadata establish sufficient affirmative proof
   * of a completed activity attributable to a student.
   * 
   * Fundamental Invariant: NO VALID EVIDENCE = NO POINT CALCULATION.
   * 
   * @param {Object} params
   * @param {string} params.text - Normalized extracted text from PDF or OCR
   * @param {string} [params.filename=''] - Original document filename
   * @param {string} [params.mimeType=''] - Document MIME type
   * @param {Object} [params.quality=null] - Extraction quality metrics
   * @returns {{
   *   evidenceStatus: 'VALID_EVIDENCE' | 'INVALID_EVIDENCE' | 'INSUFFICIENT_EVIDENCE',
   *   documentPurpose: string,
   *   reasonCode: string,
   *   reason: string,
   *   confidence: number,
   *   checks: {
   *     completedActivityEvidence: boolean,
   *     participantIdentified: boolean,
   *     activityIdentified: boolean,
   *     issuerIdentified: boolean,
   *     isNotPromotional: boolean,
   *     isNotPreEvent: boolean,
   *     isNotTemplate: boolean,
   *     qualitySufficient: boolean
   *   }
   * }}
   */
  static evaluateEvidence({ text = '', filename = '', mimeType = '', quality = null }) {
    const raw = (text || '').trim();
    const cleanText = raw.replace(/\s+/g, ' ');
    const cleanFilename = (filename || '').toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // Check 1: Extraction Quality & Legibility Gatekeeper
    // ─────────────────────────────────────────────────────────────
    const alphaNumericCount = (raw.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaNumericCount < 25 || (quality && !quality.isSufficient && alphaNumericCount < 35)) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INSUFFICIENT_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.UNKNOWN,
        reasonCode: REASON_CODES.BLURRY_OR_LOW_QUALITY,
        reason: 'Document contains insufficient readable text. Scanned files and photos must be clear, sharp, and legible.',
        confidence: 0,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: false,
          activityIdentified: false,
          issuerIdentified: false,
          isNotPromotional: true,
          isNotPreEvent: true,
          isNotTemplate: true,
          qualitySufficient: false
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Check 2: Certificate Template / Placeholder Rejection
    // ─────────────────────────────────────────────────────────────
    for (const pat of TEMPLATE_MARKERS) {
      if (pat.test(cleanText) || pat.test(cleanFilename)) {
        return {
          evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
          documentPurpose: DOCUMENT_PURPOSES.CERTIFICATE_TEMPLATE,
          reasonCode: REASON_CODES.CERTIFICATE_TEMPLATE,
          reason: 'Document is a blank certificate template or sample rather than an issued, personal certificate.',
          confidence: 0.98,
          checks: {
            completedActivityEvidence: false,
            participantIdentified: false,
            activityIdentified: false,
            issuerIdentified: false,
            isNotPromotional: true,
            isNotPreEvent: true,
            isNotTemplate: false,
            qualitySufficient: true
          }
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Check 3: Pre-Event Documents (Tickets, Hall Tickets, Receipts)
    // ─────────────────────────────────────────────────────────────
    let preEventMatches = 0;
    for (const pat of PRE_EVENT_OPERATIONAL_MARKERS) {
      if (pat.test(cleanText)) preEventMatches++;
    }
    if (/ticket|receipt|admit|invoice|registration_slip/i.test(cleanFilename)) {
      preEventMatches += 2;
    }

    if (preEventMatches >= 2) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.REGISTRATION_OR_TICKET,
        reasonCode: REASON_CODES.PRE_EVENT_DOCUMENT,
        reason: 'Document is an admission ticket, registration confirmation, or payment receipt. KTU points require proof of completed participation.',
        confidence: 0.95,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: true,
          activityIdentified: true,
          issuerIdentified: false,
          isNotPromotional: true,
          isNotPreEvent: false,
          isNotTemplate: true,
          qualitySufficient: true
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Check 4: Academic Notes / Course Syllabus
    // ─────────────────────────────────────────────────────────────
    let academicNotesMatches = 0;
    for (const pat of ACADEMIC_NOTES_MARKERS) {
      if (pat.test(cleanText)) academicNotesMatches++;
    }
    if (/notes|syllabus|module|question_paper/i.test(cleanFilename)) {
      academicNotesMatches += 2;
    }

    if (academicNotesMatches >= 2) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.ACADEMIC_NOTES,
        reasonCode: REASON_CODES.ACADEMIC_NOTES,
        reason: 'Document contains academic lecture notes, curriculum syllabus, or study material rather than activity evidence.',
        confidence: 0.95,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: false,
          activityIdentified: false,
          issuerIdentified: false,
          isNotPromotional: true,
          isNotPreEvent: true,
          isNotTemplate: true,
          qualitySufficient: true
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Check 5: Promotional Posters & Registration Flyers
    // ─────────────────────────────────────────────────────────────
    let posterScore = 0;
    for (const pat of POSTER_CALL_TO_ACTION_MARKERS) {
      if (pat.test(cleanText)) posterScore += 2.0;
    }
    if (/poster|flyer|advertisement|banner|brochure|invitation/i.test(cleanFilename)) {
      posterScore += 2.5;
    }

    let campaignScore = 0;
    for (const pat of CAMPAIGN_PROPAGANDA_MARKERS) {
      if (pat.test(cleanText)) campaignScore += 3.0;
    }

    // ─────────────────────────────────────────────────────────────
    // Check 6: Affirmative Certificate Declaratives & Signatures
    // ─────────────────────────────────────────────────────────────
    let declarativeScore = 0;
    let hasPrimaryDeclarative = false;

    for (const pat of CERTIFICATE_DECLARATIVES) {
      if (pat.test(cleanText)) {
        declarativeScore += 2.5;
        hasPrimaryDeclarative = true;
      }
    }

    let issuerScore = 0;
    for (const pat of ISSUER_AUTHORITY_MARKERS) {
      if (pat.test(cleanText)) issuerScore += 1.0;
    }

    // Evaluate Campaign / Political / Student Union Promotional Material
    if (campaignScore >= 3.0 && declarativeScore < 4.0) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.CAMPAIGN_MATERIAL,
        reasonCode: REASON_CODES.CAMPAIGN_MATERIAL,
        reason: 'Document is promotional or organizational campaign material and does not prove completed student activity.',
        confidence: 0.95,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: false,
          activityIdentified: false,
          issuerIdentified: false,
          isNotPromotional: false,
          isNotPreEvent: true,
          isNotTemplate: true,
          qualitySufficient: true
        }
      };
    }

    // Evaluate Event Posters / Call-to-Action Registration Flyers
    if (posterScore >= 3.5 && declarativeScore < 3.5) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.POSTER,
        reasonCode: REASON_CODES.PROMOTIONAL_MATERIAL,
        reason: 'Document is an event poster, flyer, or registration announcement rather than an individual activity completion certificate.',
        confidence: 0.95,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: false,
          activityIdentified: false,
          issuerIdentified: false,
          isNotPromotional: false,
          isNotPreEvent: true,
          isNotTemplate: true,
          qualitySufficient: true
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Check 7: GENERALIZATION TO UNKNOWN DOCUMENTS (Part J)
    // Even if NOT matched by any blacklist, a document MUST have
    // affirmative proof of completed activity.
    // If it lacks declarative statements, it CANNOT be VALID_EVIDENCE!
    // ─────────────────────────────────────────────────────────────
    if (!hasPrimaryDeclarative && declarativeScore < 2.5) {
      return {
        evidenceStatus: EVIDENCE_STATUS.INVALID_EVIDENCE,
        documentPurpose: DOCUMENT_PURPOSES.UNRELATED_DOCUMENT,
        reasonCode: REASON_CODES.NO_COMPLETED_ACTIVITY_EVIDENCE,
        reason: 'Document does not contain affirmative evidence of completed participation, attendance, or achievement (e.g. lacks declarative certification statement).',
        confidence: 0.90,
        checks: {
          completedActivityEvidence: false,
          participantIdentified: false,
          activityIdentified: false,
          issuerIdentified: issuerScore > 0,
          isNotPromotional: posterScore < 2,
          isNotPreEvent: true,
          isNotTemplate: true,
          qualitySufficient: true
        }
      };
    }

    // Determine specific certificate subtype purpose
    let docPurpose = DOCUMENT_PURPOSES.PARTICIPATION_CERTIFICATE;
    if (/merit/i.test(cleanText) || /first|second|third|winner|runner up/i.test(cleanText)) {
      docPurpose = DOCUMENT_PURPOSES.MERIT_CERTIFICATE;
    } else if (/completion/i.test(cleanText) || /successfully completed/i.test(cleanText)) {
      docPurpose = DOCUMENT_PURPOSES.COMPLETION_CERTIFICATE;
    } else if (/achievement/i.test(cleanText)) {
      docPurpose = DOCUMENT_PURPOSES.ACHIEVEMENT_CERTIFICATE;
    } else if (/appreciation/i.test(cleanText)) {
      docPurpose = DOCUMENT_PURPOSES.APPRECIATION_CERTIFICATE;
    }

    const calculatedConfidence = Math.min(
      0.98,
      Math.max(0.70, 0.70 + declarativeScore * 0.05 + issuerScore * 0.03 - posterScore * 0.05)
    );

    return {
      evidenceStatus: EVIDENCE_STATUS.VALID_EVIDENCE,
      documentPurpose: docPurpose,
      reasonCode: REASON_CODES.VERIFIED_ACTIVITY_EVIDENCE,
      reason: 'Valid certificate proving completed student activity confirmed.',
      confidence: parseFloat(calculatedConfidence.toFixed(2)),
      checks: {
        completedActivityEvidence: true,
        participantIdentified: true,
        activityIdentified: true,
        achievementIdentified: /first|second|third|winner|runner up|merit|achievement|prize/i.test(cleanText),
        issuerIdentified: issuerScore > 0,
        isNotPromotional: true,
        isNotPreEvent: true,
        isNotTemplate: true,
        qualitySufficient: true
      }
    };
  }
}
