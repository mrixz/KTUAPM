import { REASON_CODES } from '../../config/constants.js';

const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'er', 'shri', 'smt',
  'candidate', 'student', 'kumari', 'master'
]);

export class StudentAttribution {
  /**
   * Normalize an individual name string into cleaned tokens and initials
   */
  static tokenizeName(nameStr) {
    if (!nameStr || typeof nameStr !== 'string') {
      return { raw: '', tokens: [], initials: [], substantiveTokens: [] };
    }

    const clean = nameStr
      .toLowerCase()
      .replace(/[.\-,/_\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawTokens = clean.split(' ').filter(Boolean);
    const tokens = rawTokens.filter((t) => !HONORIFICS.has(t));

    const initials = [];
    const substantiveTokens = [];

    for (const t of tokens) {
      if (t.length === 1) {
        initials.push(t);
      } else {
        substantiveTokens.push(t);
      }
    }

    return {
      raw: clean,
      tokens,
      initials,
      substantiveTokens
    };
  }

  /**
   * Attribute participant from extracted name, user, profile, and document text
   */
  static attributeParticipant(params) {
    const extractedName = params.extractedParticipantName !== undefined ? params.extractedParticipantName : params.extractedName;
    const studentName = params.studentUser?.name || params.studentName;
    const registerNumber = params.studentProfile?.registerNumber || params.registerNumber;
    const documentText = params.documentText;
    const res = this.verifyAttribution({ extractedName, studentName, registerNumber, documentText });
    return {
      ...res,
      matchStatus: res.status
    };
  }

  /**
   * Verify if the extracted participant name in the certificate belongs to the logged-in student
   * @param {Object} params
   * @param {string|null} params.extractedName - Recipient name extracted from document/AI
   * @param {string} params.studentName - Logged-in user's profile name
   * @param {string|null} [params.registerNumber] - Student's KTU register number (e.g. TRV21CS045)
   * @param {string|null} [params.documentText] - Full normalized text of the document
   * @returns {{
   *   isAttributed: boolean,
   *   status: 'MATCHED' | 'CLEAR_MISMATCH' | 'UNRESOLVED' | 'TEMPLATE',
   *   confidence: number,
   *   reasonCode: string,
   *   reason: string
   * }}
   */
  static verifyAttribution({ extractedName, studentName, registerNumber, documentText }) {
    // 1. Check if document explicitly contains the student's KTU Register Number
    if (registerNumber && documentText) {
      const cleanReg = registerNumber.trim().toUpperCase();
      const cleanDoc = documentText.toUpperCase();
      if (cleanReg.length >= 6 && cleanDoc.includes(cleanReg)) {
        return {
          isAttributed: true,
          status: 'MATCHED',
          confidence: 0.98,
          reasonCode: REASON_CODES.VERIFIED_ACTIVITY_EVIDENCE,
          reason: `Document explicitly contains student KTU Register Number (${registerNumber}).`
        };
      }
    }

    // 2. Check for missing or blank recipient name
    if (!extractedName || extractedName.trim().length === 0) {
      return {
        isAttributed: false,
        status: 'UNRESOLVED',
        confidence: 0,
        reasonCode: REASON_CODES.MISSING_RECIPIENT_IDENTITY,
        reason: 'The document does not identify the participant or recipient.'
      };
    }

    const cleanExtracted = extractedName.trim();

    // 3. Check for placeholder / template names
    const templateNamePatterns = [
      /^(name|student name|participant name|your name|your name here|insert name|first last)$/i,
      /^[_\-\.]{3,}$/,
      /^\[.*\]$/,
      /^<.*>$/
    ];

    if (templateNamePatterns.some((pat) => pat.test(cleanExtracted))) {
      return {
        isAttributed: false,
        status: 'TEMPLATE',
        confidence: 0,
        reasonCode: REASON_CODES.CERTIFICATE_TEMPLATE,
        reason: `Document contains placeholder name ("${cleanExtracted}") indicating a template or blank certificate.`
      };
    }

    if (!studentName || studentName.trim().length === 0) {
      return {
        isAttributed: false,
        status: 'UNRESOLVED',
        confidence: 0,
        reasonCode: REASON_CODES.MISSING_RECIPIENT_IDENTITY,
        reason: 'Logged in student profile does not have a registered name.'
      };
    }

    const studentInfo = this.tokenizeName(studentName);
    const extractedInfo = this.tokenizeName(cleanExtracted);

    // 4. Exact equality check (ignoring case & whitespace)
    if (studentInfo.raw === extractedInfo.raw) {
      return {
        isAttributed: true,
        status: 'MATCHED',
        confidence: 1.0,
        reasonCode: REASON_CODES.VERIFIED_ACTIVITY_EVIDENCE,
        reason: `Participant name matches logged-in student (${studentName}).`
      };
    }

    // 5. Compare substantive tokens (handling initial expansions and name permutations)
    // Examples: "T S Mridul Narayanan" vs "T.S. MRIDUL NARAYANAN" vs "Mridul Narayanan T S" vs "Mridul Narayanan"
    const studentSub = studentInfo.substantiveTokens;
    const extractedSub = extractedInfo.substantiveTokens;

    if (studentSub.length > 0 && extractedSub.length > 0) {
      const matchingSubTokens = studentSub.filter((token) => extractedSub.includes(token));

      // If at least one major substantive token of length >= 4 matches (or all substantive tokens match)
      const hasMajorMatch = matchingSubTokens.some((t) => t.length >= 4);
      const allExtractedMatchStudent = extractedSub.every((t) => studentSub.includes(t));
      const allStudentMatchExtracted = studentSub.every((t) => extractedSub.includes(t));

      if (hasMajorMatch || allExtractedMatchStudent || allStudentMatchExtracted) {
        // Confirm there are no conflicting substantive names of length >= 4
        const conflictingInExtracted = extractedSub.filter((t) => !studentSub.includes(t) && t.length >= 4);

        if (conflictingInExtracted.length === 0) {
          return {
            isAttributed: true,
            status: 'MATCHED',
            confidence: 0.92,
            reasonCode: REASON_CODES.VERIFIED_ACTIVITY_EVIDENCE,
            reason: `Participant name "${cleanExtracted}" matches student name "${studentName}".`
          };
        }
      }
    }

    // 6. Check if extracted participant name is clearly another person
    // If extracted name has >= 2 substantive tokens and NONE match the student's tokens
    const anyTokenOverlap = extractedInfo.tokens.some((t) => studentInfo.tokens.includes(t));
    if (!anyTokenOverlap && extractedSub.length >= 1) {
      return {
        isAttributed: false,
        status: 'CLEAR_MISMATCH',
        confidence: 0.95,
        reasonCode: REASON_CODES.STUDENT_MISMATCH,
        reason: `Certificate was issued to a different person ("${cleanExtracted}") and cannot be credited to ${studentName}.`
      };
    }

    // 7. Ambiguous match
    return {
      isAttributed: false,
      status: 'UNRESOLVED',
      confidence: 0.3,
      reasonCode: REASON_CODES.MISSING_RECIPIENT_IDENTITY,
      reason: `Could not verify with certainty that certificate recipient ("${cleanExtracted}") matches ${studentName}.`
    };
  }
}
