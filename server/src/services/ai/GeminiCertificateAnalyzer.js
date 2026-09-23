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

export class GeminiCertificateAnalyzer extends CertificateAnalyzer {
  constructor(apiKey = config.geminiApiKey, modelName = config.geminiModel) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName || 'gemini-2.5-flash';
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
      let modelToUse = this.modelName || 'gemini-2.5-flash';
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
   - Standardize "level" to one of: ["International", "National", "State / Inter-University", "Zonal / District", "College / Institution", null]
   - Standardize "achievement" to one of: ["First", "Second", "Third", "Finalist", "Presentation", "Participation", "Completed", null]
   - Extract "certificateNumber", "organizer", "date", "duration", "eventName"
   - Set "confidence" based strictly on legibility and evidence (0.0 to 1.0)
5. NEVER calculate, assign, or output any KTU activity points or scores. That is strictly evaluated by the deterministic rule engine.
6. DO NOT invent or fabricate generic placeholder values like "MOOC Event", "KTU Affiliated Institution", "College / Institution", or "KTU Student". If any field (eventName, organizer, participantName, certificateNumber, level) is not established by the document text, return null for that field!
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
      const cleanEvent = sanitizePlaceholder(parsed.eventName, ['MOOC Event', 'Workshop Event', 'Hackathon Event', 'Conference Event', 'Event']);
      const cleanOrg = sanitizePlaceholder(parsed.organizer, ['KTU Affiliated Institution', 'College / Institution', 'Institution']);
      const cleanParticipant = sanitizePlaceholder(parsed.participantName, ['KTU Student', 'Student']);

      return {
        ...parsed,
        certificateNumber: cleanCertNum,
        eventName: cleanEvent,
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
    let level = null;
    let achievement = 'Participation';
    let duration = '1-2 Days';
    let confidence = validation.confidence || 0.85;

    // Detect Category & Subcategory
    if (raw.includes('nss') || raw.includes('national service scheme') || raw.includes('special camp') || raw.includes('ncc') || raw.includes('cadet')) {
      activityCategory = 'National Initiatives';
      subcategory = raw.includes('ncc') ? 'NCC' : 'NSS';
      level = raw.includes('national camp') ? 'National' : 'College / Institution';
      achievement = raw.includes('c cert') ? 'C Certificate' : 'Participation';
      confidence = Math.max(confidence, 0.90);
    } else if (raw.includes('hackathon') || raw.includes('coding') || raw.includes('codefest') || raw.includes('dev sprint')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Hackathon';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('workshop') || raw.includes('hands-on') || raw.includes('bootcamp') || raw.includes('training program')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Workshop';
      confidence = Math.max(confidence, 0.88);
    } else if (raw.includes('conference') || raw.includes('paper presentation') || raw.includes('ieee') || raw.includes('journal')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Conference';
      achievement = raw.includes('present') ? 'Presentation' : 'Participation';
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

    // Detect Level if evidenced
    if (raw.includes('international') || raw.includes('global') || raw.includes('world')) {
      level = 'International';
    } else if (raw.includes('national') || raw.includes('all india') || raw.includes('iit') || raw.includes('nit') || raw.includes('nptel') || raw.includes('swayam')) {
      level = 'National';
    } else if (raw.includes('state') || raw.includes('inter-university') || raw.includes('university') || raw.includes('ktu')) {
      level = 'State / Inter-University';
    } else if (raw.includes('zonal') || raw.includes('district') || raw.includes('inter-college')) {
      level = 'Zonal / District';
    } else if (raw.includes('college') || raw.includes('institution') || raw.includes('department')) {
      level = 'College / Institution';
    }

    // Detect Achievement
    if (raw.includes('first prize') || raw.includes('1st prize') || raw.includes('winner') || raw.includes('first place')) {
      achievement = 'First';
    } else if (raw.includes('second prize') || raw.includes('2nd prize') || raw.includes('runner up') || raw.includes('second place')) {
      achievement = 'Second';
    } else if (raw.includes('third prize') || raw.includes('3rd prize') || raw.includes('third place')) {
      achievement = 'Third';
    } else if (raw.includes('finalist') || raw.includes('shortlisted')) {
      achievement = 'Finalist';
    }

    // Detect Organizer if present
    let organizer = null;
    if (raw.includes('nptel') && raw.includes('swayam')) {
      organizer = 'NPTEL-SWAYAM';
    } else if (raw.includes('nptel')) {
      organizer = 'NPTEL';
    } else if (raw.includes('coursera')) {
      organizer = 'Coursera';
    } else if (raw.includes('ieee')) {
      organizer = 'IEEE';
    }

    // Extract Course / Event Name if present
    let eventName = null;
    const courseMatch = text.match(/(?:course\s+(?:on|in|titled|named|of)?|for\s+successfully\s+completing\s+the\s+course)\s*["':]?\s*([^"'\n\r,]{3,80})/i);
    if (courseMatch && courseMatch[1]) {
      eventName = courseMatch[1].trim();
    }

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
