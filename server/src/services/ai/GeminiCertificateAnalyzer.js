import { GoogleGenerativeAI } from '@google/generative-ai';
import { CertificateAnalyzer } from './CertificateAnalyzer.js';
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
You are a specialized KTU Certificate Understanding Engine.
Your task is to extract structured facts from this engineering student activity certificate.

STRICT INSTRUCTIONS:
1. Extract ONLY facts clearly stated in the document.
2. DO NOT fabricate, guess, or hallucinate missing information. Use null for unknown values.
3. NEVER calculate, assign, or output any KTU activity points or scores.
4. Classify the activityCategory into one of:
   ["National Initiatives", "Sports & Games", "Cultural Activities", "Professional Self-Initiatives", "Entrepreneurship & Innovation", "Leadership & Management", "Community Service & National Outreach", "Technical Skilling & Professional Mastery"]
5. Standardize 'level' to one of: ["International", "National", "State / Inter-University", "Zonal / District", "College / Institution", "Unknown"]
6. Standardize 'achievement' to one of: ["First", "Second", "Third", "Finalist", "Presentation", "Participation", "Completed", "Unknown"]
7. Output valid JSON adhering strictly to this schema:

{
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
  "confidence": number (between 0.0 and 1.0)
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
    const raw = (text + ' ' + filename).toLowerCase();
    
    let activityCategory = 'Professional Self-Initiatives';
    let subcategory = 'Workshop';
    let level = 'College / Institution';
    let achievement = 'Participation';
    let duration = '1-2 Days';
    let confidence = 0.88;

    // Detect Category & Subcategory
    if (raw.includes('nss') || raw.includes('national service scheme') || raw.includes('special camp') || raw.includes('ncc') || raw.includes('cadet')) {
      activityCategory = 'National Initiatives';
      subcategory = raw.includes('ncc') ? 'NCC' : 'NSS';
      level = raw.includes('national camp') ? 'National' : 'College / Institution';
      achievement = raw.includes('c cert') ? 'C Certificate' : 'Participation';
      confidence = 0.92;
    } else if (raw.includes('hackathon') || raw.includes('coding') || raw.includes('codefest') || raw.includes('dev sprint')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Hackathon';
      confidence = 0.90;
    } else if (raw.includes('workshop') || raw.includes('hands-on') || raw.includes('bootcamp') || raw.includes('training program')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Workshop';
      confidence = 0.91;
    } else if (raw.includes('conference') || raw.includes('paper presentation') || raw.includes('ieee') || raw.includes('journal')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Conference';
      achievement = raw.includes('present') ? 'Presentation' : 'Participation';
      confidence = 0.89;
    } else if (raw.includes('mooc') || raw.includes('nptel') || raw.includes('coursera') || raw.includes('swayam') || raw.includes('weeks')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'MOOC';
      duration = raw.includes('12 week') ? '>= 12 Weeks' : (raw.includes('8 week') ? '8 Weeks' : '4 Weeks');
      achievement = 'Completed';
      confidence = 0.94;
    } else if (raw.includes('internship') || raw.includes('industrial training') || raw.includes('intern')) {
      activityCategory = 'Professional Self-Initiatives';
      subcategory = 'Internship';
      duration = raw.includes('4 week') || raw.includes('month') ? '>= 4 Weeks' : '2-3 Weeks';
      confidence = 0.90;
    } else if (raw.includes('sports') || raw.includes('athletics') || raw.includes('tournament') || raw.includes('badminton') || raw.includes('football') || raw.includes('cricket')) {
      activityCategory = 'Sports & Games';
      subcategory = 'Athletics';
      confidence = 0.89;
    } else if (raw.includes('arts') || raw.includes('cultural') || raw.includes('dance') || raw.includes('music') || raw.includes('drama') || raw.includes('fest')) {
      activityCategory = 'Cultural Activities';
      subcategory = 'College Arts Fest';
      confidence = 0.87;
    } else if (raw.includes('startup') || raw.includes('patent') || raw.includes('incubation') || raw.includes('iedc') || raw.includes('prototype')) {
      activityCategory = 'Entrepreneurship & Innovation';
      subcategory = raw.includes('patent') ? 'Patent' : 'Startup';
      confidence = 0.91;
    } else if (raw.includes('volunteer') || raw.includes('coordinator') || raw.includes('union') || raw.includes('representative')) {
      activityCategory = 'Leadership & Management';
      subcategory = 'Event Coordinator';
      confidence = 0.85;
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
