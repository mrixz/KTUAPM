import { GoogleGenerativeAI } from '@google/generative-ai';
import { CertificateAnalyzer } from './CertificateAnalyzer.js';
import { DocumentValidator } from '../pipeline/documentValidator.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class GeminiCertificateAnalyzer extends CertificateAnalyzer {
  constructor(apiKey = config.geminiApiKey, modelName = config.geminiModel) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName || 'gemini-2.5-flash';
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async analyze({ text, buffer, mimeType, filename }) {
    const startTime = Date.now();

    // If no API key configured or in mock/offline mode, use intelligent fallback analyzer
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
You are a specialized KTU Certificate Understanding and Integrity Engine.
Your task is to analyze documents submitted for KTU Activity Points.

CRITICAL INTEGRITY INSTRUCTIONS:
1. FIRST, determine if the document is a GENUINE INDIVIDUAL CERTIFICATE (e.g., Certificate of Participation, Certificate of Merit, Certificate of Completion) awarded to a specific person.
2. If this document is an EVENT POSTER, FLYER, ADVERTISEMENT, POLITICAL / STUDENT-UNION MATERIAL (e.g. SFI/KSU/ABVP), BROCHURE, NOTICE, CALL FOR REGISTRATION, SCREENSHOT, OR UNRELATED IMAGE:
   - You MUST set "isCertificate": false
   - Set "documentType": "poster" | "advertisement" | "political_material" | "notice" | "unrelated"
   - Set "activityCategory": null
   - Set "confidence": 0.0
   - Set "rejectionReason": explain clearly why it is not a certificate (e.g., "Event poster with registration call, not an individual completion certificate.")
   - DO NOT award or guess any activity category. Mention of words like "workshop", "seminar", "hands-on", or "symposium" on a poster does NOT make it a certificate!
3. ONLY IF the document is a genuine personal certificate with declarative language ("This is to certify", "Has completed", "Awarded to", etc.):
   - Set "isCertificate": true
   - Set "documentType": "certificate"
   - Classify "activityCategory" into one of:
     ["National Initiatives", "Sports & Games", "Cultural Activities", "Professional Self-Initiatives", "Entrepreneurship & Innovation", "Leadership & Management", "Community Service & National Outreach", "Technical Skilling & Professional Mastery"]
   - Standardize "level" to one of: ["International", "National", "State / Inter-University", "Zonal / District", "College / Institution", "Unknown"]
   - Standardize "achievement" to one of: ["First", "Second", "Third", "Finalist", "Presentation", "Participation", "Completed", "Unknown"]
   - Set "confidence" based strictly on legibility and evidence (0.0 to 1.0)
4. NEVER calculate, assign, or output any KTU activity points or scores.
5. Output valid JSON adhering strictly to this schema:

{
  "isCertificate": boolean,
  "documentType": string,
  "rejectionReason": string | null,
  "certificateTitle": string | null,
  "activityCategory": string | null,
  "subcategory": string | null,
  "eventName": string | null,
  "organizer": string | null,
  "achievement": string | null,
  "level": string | null,
  "position": string | null,
  "duration": string | null,
  "date": string | null,
  "participantName": string | null,
  "certificateNumber": string | null,
  "relevantText": string | null,
  "confidence": number
}
`;

      let result;
      try {
        if (text && text.trim().length > 30) {
          result = await model.generateContent([prompt, `Document Text Content:\n${text}`]);
        } else if (buffer && mimeType && mimeType.startsWith('image/')) {
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
          logger.warn(`Model ${modelToUse} returned migration notice. Retrying with gemini-1.5-flash / gemini-2.0-flash...`);
          try {
            const fallbackModel = this.genAI.getGenerativeModel({
              model: 'gemini-1.5-flash',
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
            });
            result = await fallbackModel.generateContent([prompt, `Document Text Content:\n${text || filename}`]);
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
      return {
        ...parsed,
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
    // 1. Run Pre-Classification Document Validity Gatekeeper
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
    let level = 'College / Institution';
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

    // Detect Level
    if (raw.includes('international') || raw.includes('global') || raw.includes('world')) {
      level = 'International';
    } else if (raw.includes('national') || raw.includes('all india') || raw.includes('iit') || raw.includes('nit')) {
      level = 'National';
    } else if (raw.includes('state') || raw.includes('inter-university') || raw.includes('university') || raw.includes('ktu')) {
      level = 'State / Inter-University';
    } else if (raw.includes('zonal') || raw.includes('district') || raw.includes('inter-college')) {
      level = 'Zonal / District';
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

    // Extract Certificate Number if present
    const certNumMatch = text.match(/(?:cert(?:ificate)?\s*(?:no|id|number)?[:\s#]+)([A-Z0-9\-_/]+)/i);
    const certificateNumber = certNumMatch ? certNumMatch[1] : null;

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
      eventName: subcategory + ' Event',
      organizer: 'KTU Affiliated Institution',
      achievement,
      level,
      position: achievement !== 'Participation' ? achievement : null,
      duration,
      date: certificateDate.toISOString(),
      participantName: 'KTU Student',
      certificateNumber,
      relevantText: text.slice(0, 300),
      confidence,
      llmModel: 'heuristic-analyzer-fallback',
      llmLatencyMs: latencyMs
    };
  }
}
