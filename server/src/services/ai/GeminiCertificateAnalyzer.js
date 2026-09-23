import { GoogleGenerativeAI } from '@google/generative-ai';
import { CertificateAnalyzer } from './CertificateAnalyzer.js';
import { DocumentValidator } from '../pipeline/documentValidator.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const INVALID_CERT_NUMS = new Set([
  'is', 'of', 'the', 'a', 'an', 'no', 'to', 'for', 'in', 'on', 'at', 'by', 'or', 'and', 'with', 'id', 'num', 'number', 'na', 'null', 'none'
]);

function sanitizeCertNumber(val) {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().replace(/^[:#\s-]+/, '');
  if (INVALID_CERT_NUMS.has(clean.toLowerCase())) return null;
  if (clean.length < 3 && !/^\d+$/.test(clean)) return null;
  return clean;
}

function sanitizePlaceholder(val, disallowed) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (disallowed.some((d) => trimmed.toLowerCase() === d.toLowerCase())) return null;
  return trimmed;
}

export function formatTitleCase(str) {
  if (!str || typeof str !== 'string') return str;
  const trimmed = str.trim();
  // If string is already mixed case (e.g. Luminis Quiz, Formula Bharat 2026, IoT Workshop), preserve it
  if (trimmed !== trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) {
    return trimmed;
  }
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (/^\d+[a-z]+$/i.test(word)) return word.toUpperCase(); // e.g. 3D
      if (idx > 0 && ['and', 'in', 'of', 'for', 'the', 'at', 'on', 'as', 'to'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function cleanEventName(name) {
  if (!name || typeof name !== 'string') return null;
  let clean = name.trim();
  // Strip leading phrases like "participating in the", "for participating in", "participation in", "attended", "completed"
  clean = clean.replace(/^(?:for\s+)?(?:actively\s+|successfully\s+)?(?:participating\s+in|participation\s+in|participated\s+in|completing|completed|attending|attended)\s+(?:the\s+)?/i, '');
  clean = clean.replace(/^(?:the\s+)/i, '');
  clean = clean.replace(/\s+(?:competition|contest|challenge|championship)$/i, '');
  clean = clean.replace(/['"“”]/g, '').trim();
  return formatTitleCase(clean);
}

export function extractEventNameHeuristically(text) {
  if (!text) return null;
  // 1. Quiz (with or without single/double quotes around name or quiz)
  const quizMatch = text.match(/(?:participating\s+in\s+(?:the\s+)?|for\s+(?:the\s+)?)['"“]?([A-Za-z0-9\s\-'"]+?Quiz)['"”]?/i);
  if (quizMatch && quizMatch[1]) {
    const clean = cleanEventName(quizMatch[1]);
    if (clean && clean.length >= 3) return clean;
  }

  // 2. Workshop
  const wsMatch = text.match(/(?:participating\s+in\s+(?:the\s+)?workshop\s*:\s*|in\s+(?:the\s+)?workshop\s*:\s*)([^\n\r,]{3,60})/i) ||
                  text.match(/(?:in\s+the\s+|participating\s+in\s+(?:the\s+)?)([A-Za-z0-9\s\-]+?Workshop)/i);
  if (wsMatch && wsMatch[1]) {
    const clean = cleanEventName(wsMatch[1]);
    if (clean && clean.length >= 3) return clean;
  }

  // 3. Competition / Fest / Challenge
  const compMatch = text.match(/(?:participation\s+in\s+(?:the\s+)?)([A-Za-z0-9\s\-]+?(?:Competition|Challenge|Championship|Hackathon|Fest))/i);
  if (compMatch && compMatch[1]) {
    const clean = cleanEventName(compMatch[1]);
    if (clean && clean.length >= 3) return clean;
  }

  // 4. Course / MOOC
  const courseMatch = text.match(/(?:course\s+(?:on|in|titled|named|of)?|for\s+successfully\s+completing\s+the\s+course)\s*["':]?\s*([^"'\n\r,]{3,80})/i);
  if (courseMatch && courseMatch[1]) {
    const clean = cleanEventName(courseMatch[1]);
    if (clean && clean.length >= 3) return clean;
  }

  return null;
}

export class GeminiCertificateAnalyzer extends CertificateAnalyzer {
  constructor(apiKey = config.geminiApiKey, modelName = config.geminiModel) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName || 'gemini-1.5-flash';
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Analyze document text and extract structured activity facts
   * @param {Object} input
   * @param {string} input.text - Normalized text extracted by OCR or PDF parser (Primary Evidence)
   * @param {Buffer} [input.buffer] - Document file buffer (used only for controlled multimodal vision fallback)
   * @param {string} [input.mimeType] - MIME type
   * @param {string} [input.filename] - Original filename
   * @param {boolean} [input.allowVisionFallback=false] - Whether multimodal vision fallback is permitted
   * @returns {Promise<Object>}
   */
  async analyze({ text, buffer, mimeType, filename, allowVisionFallback = false }) {
    const startTime = Date.now();

    // If no API key configured or in mock/offline mode, use local heuristic fact extractor
    if (!this.genAI || !this.apiKey || this.apiKey === 'your_gemini_api_key_here' || this._fallbackActive) {
      return this._heuristicAnalyze({ text, filename, latencyMs: Date.now() - startTime });
    }

    try {
      let modelToUse = this.modelName || 'gemini-1.5-flash';
      let model = this.genAI.getGenerativeModel({
        model: modelToUse,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const prompt = `
You are a specialized KTU Activity Points Document Understanding Engine.
Your task is to analyze documents submitted for KTU Activity Points.

CRITICAL OPERATIONAL INSTRUCTIONS:
1. Use the provided document text as your PRIMARY AUTHORITATIVE EVIDENCE. Do not invent, hallucinate, or assume facts not present in the document.
2. FIRST, determine if the document provides evidence of COMPLETED student activity (e.g. Certificate of Participation, Merit, Completion, Achievement).
3. If this document is an EVENT POSTER, FLYER, ADVERTISEMENT, POLITICAL OR STUDENT-UNION PROMOTIONAL MATERIAL, EVENT TICKET, REGISTRATION SLIP, FEE RECEIPT, ACADEMIC NOTES, OR UNRELATED DOCUMENT:
   - Set "isCertificate": false
   - Set "documentType": "poster" | "flyer" | "advertisement" | "campaign_material" | "ticket" | "receipt" | "academic_notes" | "unrelated"
   - Set "activityCategory": null
   - Set "confidence": 0.0
   - Set "rejectionReason": explain clearly why it is not completed activity evidence
   - Mention of words like "workshop", "hackathon", "hands-on", or "seminar" on a poster or ticket does NOT make it a completed certificate!
4. ONLY IF the document proves completed participation or achievement:
   - Set "isCertificate": true
   - Set "documentType": "certificate"
   - Extract the EXACT "participantName" of the student receiving the certificate. If not clearly stated, set to null.
   - Classify "activityCategory" into one of:
     ["National Initiatives", "Sports & Games", "Cultural Activities", "Professional Self-Initiatives", "Entrepreneurship & Innovation", "Leadership & Management", "Community Service & National Outreach", "Technical Skilling & Professional Mastery"]
   - Classify "subcategory" accurately according to the activity (e.g. "Tech Quiz", "Technical Competition", "Workshop", "Conference", "Seminar", "Hackathon", "Paper Presentation", "Poster Presentation", "MOOC", "Internship", "Sports", "Arts Fest", "NCC", "NSS").
     A Quiz must be classified as "Tech Quiz" or "Technical Competition", NEVER as "Conference"!
   - CRITICAL LEVEL DETECTION RULE:
     Never infer an event's competition level merely from:
     * an occasion, holiday, or celebration name (e.g. "National Space Day", "National Science Day", "World Environment Day", "International Women's Day")
     * an organization or institution name (e.g. "National Service Scheme", "National Institute of Technology", "State Bank of India")
     * a host college or location (e.g. "Govt. College of Engineering Kannur")
     * a parent multi-fest name (e.g. being part of "National-Level Multi-Fest Xplore'24" does not make a workshop or quiz a national competition)
     * the word "National" appearing somewhere unrelated to competition scope.
     If explicit activity competition scope (e.g. "National-level competition", "Inter-college state championship") is not proven by the document, you MUST set "level": null!
   - Standardize "level" to one of: ["International", "National", "State / Inter-University", "Zonal / District", "College / Institution", null]
   - Standardize "achievement" strictly according to document: ["First", "Second", "Third", "Winner", "Finalist", "Presentation", "Participation", "Completed", null].
     Do NOT output "Presentation" when the document says participated in a quiz or workshop!
   - Extract exact "eventName" (e.g. "Luminis Quiz", "IoT Workshop", "3D Printing and Designing", "Formula Bharat 2026"). Do not output generic "Activity" or placeholders. If not present, return null.
   - Extract exact "organizer" (e.g. "IEEE SIGHT GCEK", "IEEE SB GCEK", "Government College of Engineering Kannur"). Do not simplify "IEEE SIGHT GCEK" to just "IEEE".
   - Extract "certificateNumber", "date", "duration"
   - Set "confidence" based strictly on legibility and evidence (0.0 to 1.0)
5. NEVER calculate, assign, or output any KTU activity points or scores. That is strictly evaluated by the deterministic rule engine.
6. DO NOT invent or fabricate generic placeholder values like "MOOC Event", "KTU Affiliated Institution", "College / Institution", or "KTU Student". If any field is not established by the document text, return null for that field!
7. Do not extract stop words like "is", "of", "the", "a", "no" as certificate numbers. Return null if no valid alphanumeric certificate identifier is present.
8. Output valid JSON adhering strictly to this schema:

{
  "isCertificate": boolean,
  "documentType": string,
  "rejectionReason": string | null,
  "certificateTitle": string | null,
  "participantName": string | null,
  "activityCategory": string | null,
  "subcategory": string | null,
  "eventName": string | null,
  "organizer": string | null,
  "achievement": string | null,
  "level": string | null,
  "position": string | null,
  "duration": string | null,
  "date": string | null,
  "certificateNumber": string | null,
  "relevantText": string | null,
  "confidence": number
}
`;

      let result;
      try {
        // Preferred path: OCR/PDF text is provided as primary ground truth
        if (text && text.trim().length >= 25) {
          result = await model.generateContent([prompt, `Document Text (from OCR/PDF):\n${text}`]);
        } else if (allowVisionFallback && buffer && mimeType && mimeType.startsWith('image/')) {
          // Controlled vision fallback when OCR text is genuinely weak
          const imagePart = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType
            }
          };
          result = await model.generateContent([prompt, imagePart]);
        } else {
          result = await model.generateContent([prompt, `Document filename: ${filename}\nText:\n${text || 'No text extracted'}`]);
        }
      } catch (genErr) {
        if (genErr.message && (genErr.message.includes('404') || genErr.message.includes('not found') || genErr.message.includes('no longer available'))) {
          logger.warn(`Model ${modelToUse} returned migration notice. Retrying with gemini-1.5-flash...`);
          try {
            const fallbackModel = this.genAI.getGenerativeModel({
              model: 'gemini-1.5-flash',
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
            });
            result = await fallbackModel.generateContent([prompt, `Document Text (from OCR/PDF):\n${text || filename}`]);
            this.modelName = 'gemini-1.5-flash';
          } catch (fbErr) {
            this._fallbackActive = true;
            throw genErr;
          }
        } else {
          this._fallbackActive = true;
          throw genErr;
        }
      }

      const responseText = result.response.text();
      const latencyMs = Date.now() - startTime;

      const parsed = JSON.parse(responseText);
      const cleanCertNum = sanitizeCertNumber(parsed.certificateNumber);
      const cleanEvent = sanitizePlaceholder(parsed.eventName, ['MOOC Event', 'Workshop Event', 'Hackathon Event', 'Conference Event', 'Event', 'Activity']);
      const finalEvent = cleanEvent ? cleanEventName(cleanEvent) : extractEventNameHeuristically(text);
      const cleanOrg = sanitizePlaceholder(parsed.organizer, ['KTU Affiliated Institution', 'College / Institution', 'Institution']);
      const cleanParticipant = sanitizePlaceholder(parsed.participantName, ['KTU Student', 'Student']);

      return {
        ...parsed,
        certificateNumber: cleanCertNum,
        eventName: finalEvent,
        organizer: cleanOrg,
        participantName: cleanParticipant,
        llmModel: this.modelName,
        llmLatencyMs: latencyMs
      };
    } catch (err) {
      return this._heuristicAnalyze({ text, filename, latencyMs: Date.now() - startTime });
    }
  }

  /**
   * Deterministic local heuristic fact extractor for offline / fallback / evaluation scenarios
   */
  _heuristicAnalyze({ text = '', filename = '', latencyMs = 5 }) {
    // 1. Run Evidence Validator
    const validation = DocumentValidator.validateDocument({ text, filename });

    if (!validation.isValidCertificate) {
      return {
        isCertificate: false,
        documentType: validation.documentType,
        rejectionReason: validation.reason,
        certificateTitle: null,
        activityCategory: 'unclassified',
        subcategory: null,
        eventName: null,
        organizer: null,
        achievement: null,
        level: null,
        position: null,
        duration: null,
        date: null,
        participantName: null,
        certificateNumber: null,
        relevantText: text.slice(0, 300),
        confidence: 0,
        llmModel: 'heuristic-analyzer-fallback',
        llmLatencyMs: latencyMs
      };
    }

    const raw = (text + ' ' + filename).toLowerCase();

    let activityCategory = 'Professional Self-Initiatives';
    let subcategory = 'General Participation';
    let achievement = 'Participation';
    let duration = '1-2 Days';
    let confidence = validation.confidence || 0.85;

    // Detect Category & Subcategory
    if (raw.includes('nss') || raw.includes('national service scheme') || raw.includes('special camp') || raw.includes('ncc') || raw.includes('cadet')) {
      activityCategory = 'National Initiatives';
      subcategory = raw.includes('ncc') ? 'NCC' : 'NSS';
      achievement = raw.includes('c cert') ? 'C Certificate' : 'Participation';
      confidence = Math.max(confidence, 0.90);
    } else if (raw.includes('quiz') || raw.includes('technical quiz')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Tech Quiz';
      confidence = Math.max(confidence, 0.90);
    } else if (raw.includes('formula bharat') || raw.includes('competition') || raw.includes('contest') || raw.includes('championship')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Technical Competition';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('hackathon') || raw.includes('coding') || raw.includes('codefest') || raw.includes('dev sprint')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Hackathon';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('workshop') || raw.includes('hands-on') || raw.includes('bootcamp') || raw.includes('training program')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Workshop';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('conference') || raw.includes('paper presentation') || raw.includes('journal') || raw.includes('symposium')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Conference';
      achievement = (raw.includes('presentation') || raw.includes('presented a paper') || raw.includes('paper presentation')) ? 'Presentation' : 'Participation';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('mooc') || raw.includes('nptel') || raw.includes('coursera') || raw.includes('swayam') || raw.includes('weeks')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'MOOC';
      duration = raw.includes('12 week') ? '>= 12 Weeks' : (raw.includes('8 week') ? '8 Weeks' : '4 Weeks');
      achievement = 'Completed';
      confidence = Math.max(confidence, 0.92);
    } else if (raw.includes('internship') || raw.includes('industrial training') || raw.includes('intern')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Internship';
      duration = raw.includes('4 week') || raw.includes('month') ? '>= 4 Weeks' : '2-3 Weeks';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('sports') || raw.includes('athletics') || raw.includes('tournament') || raw.includes('badminton') || raw.includes('football') || raw.includes('cricket')) {
      activityCategory = 'Sports & Games';
      subcategory = 'Athletics';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('arts') || raw.includes('cultural') || raw.includes('dance') || raw.includes('music') || raw.includes('drama') || raw.includes('fest')) {
      activityCategory = 'Cultural Activities';
      subcategory = 'College Arts Fest';
      confidence = Math.max(confidence, 0.87);
    } else if (raw.includes('startup') || raw.includes('patent') || raw.includes('incubation') || raw.includes('iedc') || raw.includes('prototype')) {
      activityCategory = 'Entrepreneurship & Innovation';
      subcategory = raw.includes('patent') ? 'Patent' : 'Startup';
      confidence = Math.max(confidence, 0.90);
    } else if (raw.includes('volunteer') || raw.includes('coordinator') || raw.includes('representative')) {
      activityCategory = 'Leadership & Management';
      subcategory = 'Event Coordinator';
      confidence = Math.max(confidence, 0.85);
    }

    // Detect Level Anti-Hallucination:
    // Strip out non-scope occurrences of "National", "International", etc.
    let levelText = raw;
    levelText = levelText.replace(/national\s+space\s+day/g, ' ');
    levelText = levelText.replace(/national\s+science\s+day/g, ' ');
    levelText = levelText.replace(/national\s+service\s+scheme/g, ' ');
    levelText = levelText.replace(/national\s+technology\s+day/g, ' ');
    levelText = levelText.replace(/world\s+environment\s+day/g, ' ');
    levelText = levelText.replace(/international\s+women'?s\s+day/g, ' ');
    levelText = levelText.replace(/international\s+day\s+of/g, ' ');
    levelText = levelText.replace(/national\s+institute\s+of\s+technology/g, ' ');
    levelText = levelText.replace(/state\s+bank\s+of\s+india/g, ' ');
    levelText = levelText.replace(/state\s+bank/g, ' ');
    // Strip parent multi-fest mentions (subactivity does not inherit parent event level automatically)
    levelText = levelText.replace(/(?:organized\s+as\s+part\s+of|part\s+of|during)\s+(?:the\s+)?national[- ]level\s+(?:multi[- ]fest|fest|tech[- ]fest)[^\n\r,]*/g, ' ');
    // Strip host college / location
    levelText = levelText.replace(/hosted\s+at\s+govt\.?\s+college[^\n\r,]*/g, ' ');
    levelText = levelText.replace(/hosted\s+at\s+government\s+college[^\n\r,]*/g, ' ');
    levelText = levelText.replace(/hosted\s+at\s+[^\n\r,]+/g, ' ');

    let level = null;
    if (levelText.includes('international-level') || levelText.includes('international level') || levelText.includes('international competition') || levelText.includes('international symposium') || levelText.includes('international championship')) {
      level = 'International';
    } else if (levelText.includes('national-level competition') || levelText.includes('national level competition') || levelText.includes('national competition') || levelText.includes('national-level contest') || levelText.includes('national-level championship') || levelText.includes('all india competition') || levelText.includes('national championship') || levelText.includes('national camp')) {
      level = 'National';
    } else if (levelText.includes('state-level') || levelText.includes('state level') || levelText.includes('state championship') || levelText.includes('inter-university') || levelText.includes('university level')) {
      level = 'State / Inter-University';
    } else if (levelText.includes('zonal-level') || levelText.includes('zonal level') || levelText.includes('district-level') || levelText.includes('district level') || levelText.includes('inter-college competition') || levelText.includes('inter-college zonal')) {
      level = 'Zonal / District';
    } else if (levelText.includes('college-level') || levelText.includes('college level') || levelText.includes('inter-department') || levelText.includes('intra-college')) {
      level = 'College / Institution';
    }

    // Detect Achievement strictly from document
    if (raw.includes('first prize') || raw.includes('1st prize') || raw.includes('first place') || raw.includes('1st place')) {
      achievement = 'First';
    } else if (raw.includes('second prize') || raw.includes('2nd prize') || raw.includes('second place') || raw.includes('runner up')) {
      achievement = 'Second';
    } else if (raw.includes('third prize') || raw.includes('3rd prize') || raw.includes('third place')) {
      achievement = 'Third';
    } else if (raw.includes('winner') && !raw.includes('winner of')) {
      achievement = 'Winner';
    } else if (raw.includes('finalist') || raw.includes('shortlisted')) {
      achievement = 'Finalist';
    }

    // Detect Organizer with specific resolution
    let organizer = null;
    if (raw.includes('ieee sight gcek') || raw.includes('ieee sight')) {
      organizer = 'IEEE SIGHT GCEK';
    } else if (raw.includes('ieee sb gcek') || raw.includes('ieee student branch gcek')) {
      organizer = 'IEEE SB GCEK';
    } else if (raw.includes('ieee')) {
      organizer = 'IEEE';
    } else if (raw.includes('govt. college of engineering, kannur') || raw.includes('government college of engineering kannur') || raw.includes('govt. college of engineering kannur') || raw.includes('gcek')) {
      organizer = 'Government College of Engineering Kannur';
    } else if (raw.includes('nptel') && raw.includes('swayam')) {
      organizer = 'NPTEL-SWAYAM';
    } else if (raw.includes('nptel')) {
      organizer = 'NPTEL';
    } else if (raw.includes('coursera')) {
      organizer = 'Coursera';
    } else if (raw.includes('formula bharat')) {
      organizer = 'Formula Bharat';
    }

    // Extract Course / Event Name with specific resolution
    const eventName = extractEventNameHeuristically(text);

    // Extract Certificate Number if reliably present
    const certNumMatch = text.match(/(?:cert(?:ificate)?\s*(?:no\.?|id|number|code|\#)\s*[:#\-]?\s*|certificate\s*:\s*)([A-Z0-9\-_/]+)/i);
    const certificateNumber = certNumMatch ? sanitizeCertNumber(certNumMatch[1]) : null;

    // Extract Recipient / Participant Name if present
    let participantName = null;
    const nameMatch = text.match(/(?:certify\s+that\s+|presented\s+to\s+|awarded\s+to\s+)(?:mr\.?|ms\.?|mrs\.?|er\.?|dr\.?)?\s*([A-Za-z\s.]+?)(?:,|\s+of\b|\s+student\b|\s+has\b|\s+\(|\n|$)/i);
    if (nameMatch && nameMatch[1]) {
      const cleanName = nameMatch[1].trim();
      if (cleanName.length >= 3 && cleanName.length <= 40 && !/^(the|a|this|college|department)\b/i.test(cleanName)) {
        participantName = cleanName;
      }
    }

    // Extract Date if present
    const dateMatch = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);
    const certificateDate = dateMatch ? new Date(dateMatch[1]) : new Date();

    return {
      isCertificate: true,
      documentType: 'certificate',
      rejectionReason: null,
      certificateTitle: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      activityCategory,
      subcategory,
      eventName,
      organizer,
      achievement,
      level,
      position: achievement !== 'Participation' ? achievement : null,
      duration,
      date: certificateDate.toISOString(),
      participantName: participantName || null,
      certificateNumber,
      relevantText: text.slice(0, 300),
      confidence,
      llmModel: 'heuristic-analyzer-fallback',
      llmLatencyMs: latencyMs
    };
  }
}
