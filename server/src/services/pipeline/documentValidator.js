/**
 * DocumentValidator
 * Validates whether an uploaded document is a genuine personal activity certificate
 * before activity classification or KTU point evaluation occurs.
 * 
 * Prevents posters, event advertisements, political/union flyers (e.g. SFI/KSU/ABVP),
 * brochures, notices, screenshots, memes, and unrelated images from being classified
 * as valid activities or receiving KTU activity points.
 */

// Strong declaratives that appear on genuine certificates
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

// Structural certificate features (signatories, candidates, IDs)
const CERTIFICATE_METADATA_MARKERS = [
  /\b(principal|convenor|convener|coordinator|co-ordinator|hod|head of department|director|dean|patron|authorized\s+signatory|course\s+instructor)\b/i,
  /\b(register\s*no|reg\s*no|roll\s*no|ktu\s*id|candidate\s*id|cert(?:ificate)?\s*(?:no|id|number))\b/i,
  /\b(student\s+of|semester|branch|department\s+of|college\s+of\s+engineering|institute\s+of\s+technology)\b/i,
  /\b(nptel|swayam|coursera|udemy|ieee|iste|csi|acm|nss|ncc|ktu|technical\s+university)\b/i
];

// Indicators of posters, advertisements, flyers, invitations, calls for registration
const POSTER_CALL_TO_ACTION_MARKERS = [
  /\b(register\s+(here|now|today)|registration\s+link|scan\s+(the\s+)?qr(\s+code)?|scan\s+to\s+register)\b/i,
  /\b(entry\s+fee|registration\s+fee|free\s+entry|free\s+registration|last\s+date\s+to\s+register|registration\s+deadline)\b/i,
  /\b(google\s+form|forms\.gle|bit\.ly|tinyurl\.com|linktr\.ee)\b/i,
  /\b(all\s+are\s+welcome|cordially\s+invites|invitation|you\s+are\s+invited|join\s+us|calling\s+all|be\s+there)\b/i,
  /\b(proudly\s+presents|cordially\s+welcomes|presents\s+a\s+one\s+day|presents\s+a\s+two\s+day|organizing\s+a|organises\s+a)\b/i,
  /\b(venue\s*:|venue\s+declared|date\s*:\s*\w+\s+\d{1,2}|time\s*:\s*\d{1,2}[:.]\d{2})\b/i,
  /\b(for\s+queries|for\s+details|contact\s*:|call\s+on\s*:|ph(?:one)?\s*:\s*\+?\d{8,})\b/i,
  /\b(cash\s+prizes?\s+worth|prize\s+pool|exciting\s+prizes|win\s+up\s+to)\b/i,
  /\b(resource\s+person\s*:|speaker\s*:|keynote\s+speaker\s*:|chief\s+guest\s*:)\b/i
];

// Political, student organization, and union propaganda indicators
const POLITICAL_AND_UNION_MARKERS = [
  /\b(sfi|students?\s+federation\s+of\s+india)\b/i,
  /\b(ksu|kerala\s+students?\s+union)\b/i,
  /\b(abvp|akhil\s+bharatiya\s+vidyarthi\s+parishad)\b/i,
  /\b(msf|muslim\s+students?\s+federation)\b/i,
  /\b(aisf|all\s+india\s+students?\s+federation)\b/i,
  /\b(comrades?|inquilab|zindabad|dharna|hartal|strike|protest\s+march)\b/i,
  /\b(union\s+election|vote\s+for|ballot|presidential\s+candidate|general\s+secretary\s+candidate)\b/i,
  /\b(area\s+committee|district\s+committee|state\s+committee|unit\s+conference)\b/i
];

export class DocumentValidator {
  /**
   * Validate whether extracted document text represents a genuine individual activity certificate
   * @param {Object} params
   * @param {string} params.text - Extracted text from PDF or OCR
   * @param {string} [params.filename=''] - Original filename
   * @param {string} [params.mimeType=''] - Document MIME type
   * @returns {{
   *   isValidCertificate: boolean,
   *   documentType: string,
   *   confidence: number,
   *   reason: string,
   *   matchedPositiveMarkers: number,
   *   matchedNegativeMarkers: number
   * }}
   */
  static validateDocument({ text = '', filename = '', mimeType = '' }) {
    const raw = (text || '').trim();
    const cleanText = raw.replace(/\s+/g, ' ');
    const normalized = cleanText.toLowerCase();
    const cleanFilename = (filename || '').toLowerCase();

    // 1. OCR Quality & Empty / Low Text Check
    // Certificates typically have at least 40-50 characters of text
    const alphaNumericCount = (raw.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaNumericCount < 25) {
      return {
        isValidCertificate: false,
        documentType: 'blank_or_low_text',
        confidence: 0,
        reason: 'Document contains insufficient readable text. Scanned files must be clear and legible.',
        matchedPositiveMarkers: 0,
        matchedNegativeMarkers: 0
      };
    }

    // 2. Count Positive Certificate Declaratives & Signatures
    let positiveScore = 0;
    const matchedPositive = [];

    for (const pattern of CERTIFICATE_DECLARATIVES) {
      if (pattern.test(cleanText)) {
        positiveScore += 2.5; // Strong declarative weight
        matchedPositive.push(pattern.toString());
      }
    }

    for (const pattern of CERTIFICATE_METADATA_MARKERS) {
      if (pattern.test(cleanText)) {
        positiveScore += 1.0; // Metadata / structural weight
        matchedPositive.push(pattern.toString());
      }
    }

    // 3. Count Negative Poster / Advertisement / Union Markers
    let negativePosterScore = 0;
    const matchedPosters = [];

    for (const pattern of POSTER_CALL_TO_ACTION_MARKERS) {
      if (pattern.test(cleanText)) {
        negativePosterScore += 2.0;
        matchedPosters.push(pattern.toString());
      }
    }

    let negativePoliticalScore = 0;
    const matchedPolitical = [];

    for (const pattern of POLITICAL_AND_UNION_MARKERS) {
      if (pattern.test(cleanText)) {
        negativePoliticalScore += 3.5;
        matchedPolitical.push(pattern.toString());
      }
    }

    // 4. Filename checks (e.g. poster.jpg, flyer.png, sfi_convention.pdf)
    if (/poster|flyer|advertisement|banner|brochure|invitation|pamphlet/i.test(cleanFilename)) {
      negativePosterScore += 2.5;
    }
    if (/sfi|ksu|abvp|msf|aisf/i.test(cleanFilename)) {
      negativePoliticalScore += 3.5;
    }
    if (/cert(?:ificate)?/i.test(cleanFilename)) {
      positiveScore += 0.5;
    }

    // 5. Evaluate Political / Student Union Posters
    if (negativePoliticalScore >= 3.0) {
      // Even if the poster says "workshop" or "seminar", union propaganda must NEVER receive KTU points
      if (positiveScore < 5.0) {
        return {
          isValidCertificate: false,
          documentType: 'political_or_student_org_poster',
          confidence: 0,
          reason: 'Document identified as political or student-organization promotional material (not an official KTU activity certificate).',
          matchedPositiveMarkers: matchedPositive.length,
          matchedNegativeMarkers: matchedPolitical.length
        };
      }
    }

    // 6. Evaluate Event Posters / Announcements / Invitations
    // Posters frequently mention "workshop", "seminar", "hands-on session" but have "register now", "venue", "contact us"
    if (negativePosterScore >= 3.5 && positiveScore < 4.0) {
      return {
        isValidCertificate: false,
        documentType: 'poster_or_announcement',
        confidence: 0,
        reason: 'Document identified as an event poster, flyer, or registration announcement rather than an individual completion certificate.',
        matchedPositiveMarkers: matchedPositive.length,
        matchedNegativeMarkers: matchedPosters.length
      };
    }

    // 7. Verify Minimum Positive Evidence Threshold
    // An individual certificate MUST contain at least one primary declarative statement
    const hasPrimaryDeclarative = CERTIFICATE_DECLARATIVES.some((pattern) => pattern.test(cleanText));

    if (!hasPrimaryDeclarative && positiveScore < 3.0) {
      return {
        isValidCertificate: false,
        documentType: 'unclassified_document',
        confidence: 0,
        reason: 'Document lacks formal certificate declaratives (e.g. "This is to certify that", "Certificate of Participation", or "Has completed").',
        matchedPositiveMarkers: matchedPositive.length,
        matchedNegativeMarkers: matchedPosters.length + matchedPolitical.length
      };
    }

    // 8. Calculate Valid Certificate Confidence (0.70 to 0.98)
    const normalizedScore = Math.min(1.0, Math.max(0.70, 0.65 + (positiveScore * 0.05) - (negativePosterScore * 0.04)));

    return {
      isValidCertificate: true,
      documentType: 'certificate',
      confidence: parseFloat(normalizedScore.toFixed(2)),
      reason: 'Valid individual activity certificate verified.',
      matchedPositiveMarkers: matchedPositive.length,
      matchedNegativeMarkers: matchedPosters.length + matchedPolitical.length
    };
  }
}
