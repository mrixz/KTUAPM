import { ruleLoader } from './ruleLoader.js';
import { normalizeText } from '../../utils/fileHash.js';
import { PROCESSING_STATUS } from '../../config/constants.js';

export class RuleEngine {
  /**
   * Find matching rule from official ruleset based on AI extracted facts
   * @param {Object} params
   * @param {string} params.scheme
   * @param {string} params.ruleVersion
   * @param {string} params.entryType
   * @param {Object} params.facts
   * @returns {{ matchedRule: Object|null, category: Object|null, ruleSet: Object|null }}
   */
  static matchRule({ scheme, ruleVersion, entryType, facts }) {
    const ruleSet = ruleLoader.getRuleSet(scheme, ruleVersion);
    if (!ruleSet) {
      return { matchedRule: null, category: null, ruleSet: null };
    }

    const normCategory = normalizeText(facts.activityCategory || '');
    const normSubcategory = normalizeText(facts.subcategory || '');
    const normTitle = normalizeText(facts.certificateTitle || '');
    const normEvent = normalizeText(facts.eventName || '');
    const normText = normalizeText(facts.relevantText || '');
    const combinedSearchText = `${normCategory} ${normSubcategory} ${normTitle} ${normEvent} ${normText}`;

    // 1. Identify category definition (Group I/II/III for 2024, 6 segments for 2019)
    let matchedCategory = null;

    // Direct check by category id or code (e.g., group_1, group_2, group_3, nat, spt, cul, pro, ent, ldr)
    matchedCategory = ruleSet.categories.find((c) => {
      const catId = normalizeText(c.id);
      const catCode = normalizeText(c.code);
      const catName = normalizeText(c.name);
      return (
        normCategory === catId ||
        normCategory === catCode ||
        normCategory === catName ||
        (normCategory && (catName.includes(normCategory) || normCategory.includes(catName)))
      );
    });

    // Match category by subcategories
    if (!matchedCategory && normSubcategory) {
      matchedCategory = ruleSet.categories.find((c) =>
        c.subcategories.some((sub) => {
          const normSub = normalizeText(sub);
          return normSubcategory.includes(normSub) || normSub.includes(normSubcategory);
        })
      );
    }

    // Match category by keyword content in title/event/text
    if (!matchedCategory) {
      matchedCategory = ruleSet.categories.find((c) =>
        c.subcategories.some((sub) => {
          const normSub = normalizeText(sub);
          return normSub.length > 3 && combinedSearchText.includes(normSub);
        })
      );
    }

    // 2. Identify candidate rules (within matched category if explicitly resolved, otherwise across entire ruleset)
    const candidateRules = matchedCategory
      ? ruleSet.rules.filter((r) => r.categoryId === matchedCategory.id)
      : ruleSet.rules;

    let matchedRule = null;

    // Direct subActivityNo match if available (e.g. 1.1, 2.20, 3.15)
    if (facts.subActivityNo) {
      matchedRule =
        candidateRules.find((r) => r.subActivityNo === facts.subActivityNo) ||
        ruleSet.rules.find((r) => r.subActivityNo === facts.subActivityNo);
    }

    if (!matchedRule && facts.ruleId) {
      matchedRule =
        candidateRules.find((r) => r.ruleId === facts.ruleId) ||
        ruleSet.rules.find((r) => r.ruleId === facts.ruleId);
    }

    // Rank candidate rules by specificity
    if (!matchedRule) {
      const isWinnerFact =
        (facts.achievement || '').toLowerCase().includes('win') ||
        (facts.achievement || '').toLowerCase().includes('prize') ||
        (facts.achievement || '').toLowerCase().includes('first') ||
        (facts.achievement || '').toLowerCase().includes('second') ||
        (facts.achievement || '').toLowerCase().includes('third') ||
        (facts.subcategory || '').toLowerCase().includes('win') ||
        (facts.certificateTitle || '').toLowerCase().includes('merit') ||
        (facts.certificateTitle || '').toLowerCase().includes('winner');

      let bestScore = -1;
      let bestRule = null;

      for (const rule of candidateRules) {
        let score = 0;
        const normRuleSub = normalizeText(rule.subcategory || '');
        const normRuleAct = normalizeText(rule.activityName || '');
        const normRuleId = normalizeText(rule.ruleId || '');

        // Rule mentions winner vs participation
        const isWinnerRule =
          normRuleAct.includes('winner') ||
          normRuleAct.includes('prize') ||
          normRuleSub.includes('winner') ||
          normRuleId.includes('win');

        if (isWinnerFact && isWinnerRule) score += 30;
        if (!isWinnerFact && !isWinnerRule) score += 15;
        if (isWinnerFact && !isWinnerRule && normRuleAct.includes('participation')) score -= 20;

        if (normSubcategory && (normSubcategory === normRuleSub || normSubcategory === normRuleAct)) {
          score += 50;
        } else if (normSubcategory && normRuleAct.includes(normSubcategory)) {
          score += 35;
        } else if (normSubcategory && (normSubcategory.includes(normRuleSub) || normRuleSub.includes(normSubcategory))) {
          score += 20;
        }

        // Keywords in title, event, or text matching activity name / subcategory
        if (combinedSearchText.includes(normRuleAct) && normRuleAct.length > 3) score += 30;
        if (normRuleSub.length > 3 && combinedSearchText.includes(normRuleSub)) score += 20;

        // Specific specialized program rules checks (GDC, LEAP, YIP, STRIDE, ICFOSS)
        const isSpecializedProgramRule =
          normRuleId.includes('gdc') ||
          normRuleId.includes('leap') ||
          normRuleId.includes('yip') ||
          normRuleId.includes('stride') ||
          normRuleId.includes('icfoss') ||
          normRuleId === '2024-g2-2.19' ||
          normRuleId === '2024-g3-3.8' ||
          normRuleSub.includes('icfoss') ||
          normRuleAct.includes('icfoss');

        if (isSpecializedProgramRule) {
          const hasProgramMention =
            (normRuleId.includes('gdc') && (combinedSearchText.includes('gdc') || combinedSearchText.includes('aicte') || combinedSearchText.includes('nhm'))) ||
            (normRuleId.includes('leap') && (combinedSearchText.includes('leap') || combinedSearchText.includes('iit madras') || combinedSearchText.includes('iitmic'))) ||
            (normRuleId.includes('yip') && (combinedSearchText.includes('yip') || combinedSearchText.includes('k-disc') || combinedSearchText.includes('kdisc'))) ||
            (normRuleId.includes('stride') && (combinedSearchText.includes('stride') || combinedSearchText.includes('k-disc') || combinedSearchText.includes('kdisc'))) ||
            ((normRuleId.includes('icfoss') || normRuleId === '2024-g2-2.19' || normRuleId === '2024-g3-3.8') && combinedSearchText.includes('icfoss'));

          if (!hasProgramMention) {
            score -= 80;
          } else {
            score += 50;
          }
        }

        // Specific token matching for technical domains (internship, workshop, tech fest, sports, mooc, hackathon)
        if (combinedSearchText.includes('intern') && (normRuleAct.includes('intern') || normRuleSub.includes('intern'))) {
          if (!normRuleAct.includes('report') && !normRuleSub.includes('report')) {
            score += 40;
          }
        }
        if (combinedSearchText.includes('workshop') && (normRuleAct.includes('workshop') || normRuleSub.includes('workshop'))) score += 35;
        if (combinedSearchText.includes('hackathon') && (normRuleAct.includes('hackathon') || normRuleSub.includes('hackathon'))) {
          score += 35;
          const hasInternational = combinedSearchText.includes('international') || combinedSearchText.includes('level 5') || combinedSearchText.includes('level v');
          const isInternationalRule = normRuleAct.includes('international') || normRuleSub.includes('international');
          if (hasInternational && isInternationalRule) score += 30;
          if (!hasInternational && isInternationalRule) score -= 30;
          if (!hasInternational && !isInternationalRule && (normRuleAct.includes('national') || normRuleSub.includes('national'))) score += 30;
        }
        if (combinedSearchText.includes('paper') && (normRuleAct.includes('paper') || normRuleSub.includes('paper'))) score += 35;
        if (combinedSearchText.includes('tech fest') && (normRuleAct.includes('tech fest') || normRuleSub.includes('tech fest'))) score += 35;

        // Deterministic rule selection precedence for Quizzes & Competitions:
        // Sl. 10 (Competitions Conducted by Professional Societies) vs Sl. 8 (Tech Fest, Tech Quiz)
        const isProfessionalSocietyOrganizer =
          combinedSearchText.includes('ieee') ||
          combinedSearchText.includes('iet') ||
          combinedSearchText.includes('asme') ||
          combinedSearchText.includes('sae') ||
          combinedSearchText.includes('csi') ||
          combinedSearchText.includes('iste') ||
          combinedSearchText.includes('acm');

        const isSocietyRule =
          normRuleId.includes('society') ||
          normRuleAct.includes('professional societies') ||
          normRuleSub.includes('professional societies');

        const isQuizFact =
          combinedSearchText.includes('quiz') ||
          normSubcategory.includes('quiz');

        const isTechFestRule =
          normRuleId.includes('techfest') ||
          normRuleAct.includes('tech fest') ||
          normRuleSub.includes('tech fest');

        if (isQuizFact) {
          if (isProfessionalSocietyOrganizer && isSocietyRule) {
            // Issuing authority is a professional society: Sl. 10 is the more specific rule
            score += 100;
          } else if (isProfessionalSocietyOrganizer && isTechFestRule) {
            score -= 30;
          } else if (!isProfessionalSocietyOrganizer && isTechFestRule) {
            // General college/fest quiz: Sl. 8 is the primary rule
            score += 60;
          } else if (isTechFestRule) {
            score += 30;
          } else if (isSocietyRule) {
            score += 20;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestRule = rule;
        }
      }

      if (bestRule && bestScore > 0) {
        matchedRule = bestRule;
        matchedCategory = ruleSet.categories.find((c) => c.id === bestRule.categoryId) || matchedCategory;
      }
    }

    if (!matchedRule && matchedCategory) {
      const catRules = ruleSet.rules.filter((r) => r.categoryId === matchedCategory.id);
      if (catRules.length > 0) {
        matchedRule = catRules[0];
      }
    }

    return {
      matchedRule,
      category: matchedCategory,
      ruleSet
    };
  }

  /**
   * Determine base points awarded deterministically based on rule and extracted parameters
   * @param {Object} matchedRule 
   * @param {Object} facts 
   * @returns {number}
   */
  static calculateBasePoints(matchedRule, facts) {
    if (!matchedRule) return 0;

    const {
      scoringType,
      pointsMatrix,
      fixedPoints = 0,
      maxPointsPerActivity = 50,
      ratePerHour = 1
    } = matchedRule;

    // 1. Fixed Points
    if (scoringType === 'fixed') {
      return Math.min(fixedPoints, maxPointsPerActivity);
    }

    // 2. Level & Achievement Matrix (e.g. 2024 Sports, Tech-Fest, Paper Presentation, Professional Societies)
    if (scoringType === 'level_achievement' && pointsMatrix) {
      const level = this._normalizeLevel(facts.level);
      if (!level) {
        return null;
      }
      const romanLevel = this._toRomanLevel(level);
      const achievement = this._normalizeAchievement(facts.achievement);

      // Match level key (Level 1-5 or Level I-V)
      let levelMatrix = pointsMatrix[level] || pointsMatrix[romanLevel];
      if (!levelMatrix) {
        const levelKey = Object.keys(pointsMatrix).find((k) =>
          normalizeText(k).includes(normalizeText(level)) || normalizeText(level).includes(normalizeText(k))
        );
        levelMatrix = levelKey ? pointsMatrix[levelKey] : null;
      }

      if (!levelMatrix) {
        const keys = Object.keys(pointsMatrix);
        levelMatrix = pointsMatrix[keys[keys.length - 1]] || {};
      }

      if (typeof levelMatrix === 'number') {
        return Math.min(levelMatrix, maxPointsPerActivity);
      }

      let pts = levelMatrix[achievement];
      if (pts === undefined) {
        const achKey = Object.keys(levelMatrix).find((k) =>
          normalizeText(k).includes(normalizeText(achievement)) || normalizeText(achievement).includes(normalizeText(k))
        );
        pts = achKey ? levelMatrix[achKey] : (levelMatrix['Participation'] || levelMatrix['Winner'] || Object.values(levelMatrix)[0] || 0);
      }

      return Math.min(pts || 0, maxPointsPerActivity);
    }

    // 3. Level Achievement with Prize (2019 Sports, Games, Cultural Arts)
    if (scoringType === 'level_achievement_prize') {
      const level = this._normalizeLevel(facts.level);
      if (!level) {
        return null;
      }
      const romanLevel = this._toRomanLevel(level);
      const achievement = this._normalizeAchievement(facts.achievement);

      if (pointsMatrix && (pointsMatrix[level] || pointsMatrix[romanLevel])) {
        const matrix = pointsMatrix[level] || pointsMatrix[romanLevel];
        const pts = matrix[achievement] ?? matrix['Participation'] ?? 0;
        return Math.min(pts, maxPointsPerActivity);
      }

      const partPts =
        matchedRule.participationPoints?.[romanLevel] ||
        matchedRule.participationPoints?.[level] ||
        8;
      const prizePts =
        matchedRule.prizePoints?.[achievement]?.[romanLevel] ||
        matchedRule.prizePoints?.[achievement]?.[level] ||
        0;
      const total = partPts + prizePts;
      return Math.min(total, maxPointsPerActivity);
    }

    // 4. Standardized Tests (TOEFL, IELTS, PTE, BEC, GRE, GATE, CAT, GMAT)
    if (scoringType === 'standardized_test') {
      return this._calculateStandardizedTestPoints(matchedRule, facts);
    }

    // 5. Rate Per Hour (2024 Skilling Certificates)
    if (scoringType === 'rate_per_hour') {
      const durationHours = this._extractHours(facts.duration || facts.relevantText || '');
      const calculated = durationHours > 0 ? durationHours * ratePerHour : fixedPoints;
      return Math.min(calculated, maxPointsPerActivity);
    }

    // 6. Duration Based (Workshops, Internships, MOOCs)
    if (scoringType === 'duration_based' && pointsMatrix) {
      const durationText = normalizeText(facts.duration || facts.relevantText || '');
      for (const [durKey, pts] of Object.entries(pointsMatrix)) {
        const normKey = normalizeText(durKey);
        if (durationText && (durationText.includes(normKey) || normKey.includes(durationText))) {
          return Math.min(pts, maxPointsPerActivity);
        }
      }

      if (durationText.includes('12 week') || durationText.includes('3 month')) {
        return pointsMatrix['>= 12 Weeks'] || pointsMatrix['>= 12 Weeks (Elite/Gold)'] || 30;
      }
      if (durationText.includes('8 week') || durationText.includes('2 month')) {
        return pointsMatrix['8 Weeks'] || 20;
      }
      if (durationText.includes('4 week') || durationText.includes('1 month')) {
        return pointsMatrix['4 Weeks'] || pointsMatrix['>= 4 Weeks'] || 15;
      }
      if (durationText.includes('5 day') || durationText.includes('6 day')) {
        return pointsMatrix['>= 5 Days'] || 20;
      }
      if (durationText.includes('3 day') || durationText.includes('4 day')) {
        return pointsMatrix['>= 3 Days'] || pointsMatrix['3-4 Days'] || 15;
      }
      if (durationText.includes('1 day') || durationText.includes('2 day')) {
        return pointsMatrix['1-2 Days'] || 10;
      }

      const defaultPts = Object.values(pointsMatrix).slice(-1)[0] || 5;
      return Math.min(defaultPts, maxPointsPerActivity);
    }

    // 7. Tiered / Role-Based (Patents, Hackathons, Leadership, Clubs, Councils)
    if ((scoringType === 'tiered' || scoringType === 'role_based') && pointsMatrix) {
      const combinedFacts = normalizeText(
        `${facts.certificateTitle || ''} ${facts.achievement || ''} ${facts.position || ''} ${facts.relevantText || ''} ${facts.subcategory || ''}`
      );

      for (const [tierKey, pts] of Object.entries(pointsMatrix)) {
        const normTier = normalizeText(tierKey);
        if (combinedFacts.includes(normTier)) {
          return Math.min(pts, maxPointsPerActivity);
        }
      }

      for (const [tierKey, pts] of Object.entries(pointsMatrix)) {
        const tokens = normalizeText(tierKey).split(' ').filter((t) => t.length > 3);
        if (tokens.length > 0 && tokens.every((tok) => combinedFacts.includes(tok))) {
          return Math.min(pts, maxPointsPerActivity);
        }
      }

      for (const [tierKey, pts] of Object.entries(pointsMatrix)) {
        const tokens = normalizeText(tierKey).split(' ').filter((t) => t.length > 4);
        if (tokens.some((tok) => combinedFacts.includes(tok))) {
          return Math.min(pts, maxPointsPerActivity);
        }
      }

      const defaultTierPts = matchedRule.fixedPoints || Object.values(pointsMatrix).slice(-1)[0] || 10;
      return Math.min(defaultTierPts, maxPointsPerActivity);
    }

    return 0;
  }

  static _normalizeLevel(levelStr) {
    if (!levelStr) return null;
    const norm = normalizeText(levelStr);
    if (!norm || norm === 'null' || norm === 'unknown' || norm === 'standard') return null;
    if (norm.includes('international') || norm.includes('level 5') || norm.includes('level v')) return 'Level 5';
    if (norm.includes('national') || norm.includes('level 4') || norm.includes('level iv')) return 'Level 4';
    if (norm.includes('state') || norm.includes('university') || norm.includes('level 3') || norm.includes('level iii')) return 'Level 3';
    if (norm.includes('zonal') || norm.includes('district') || norm.includes('level 2') || norm.includes('level ii')) return 'Level 2';
    if (norm.includes('college') || norm.includes('institution') || norm.includes('level 1') || norm.includes('level i')) return 'Level 1';
    return null;
  }

  static _toRomanLevel(levelStr) {
    const map = {
      'Level 1': 'Level I',
      'Level 2': 'Level II',
      'Level 3': 'Level III',
      'Level 4': 'Level IV',
      'Level 5': 'Level V'
    };
    return map[levelStr] || levelStr;
  }

  static _normalizeAchievement(achStr) {
    if (!achStr) return 'Participation';
    const norm = normalizeText(achStr);
    if (norm.includes('first') || norm.includes('1st') || norm.includes('winner') || norm.includes('1 prize')) return 'First';
    if (norm.includes('second') || norm.includes('2nd') || norm.includes('runner') || norm.includes('2 prize')) return 'Second';
    if (norm.includes('third') || norm.includes('3rd') || norm.includes('3 prize')) return 'Third';
    if (norm.includes('finalist')) return 'Finalist';
    if (norm.includes('present')) return 'Presentation';
    return 'Participation';
  }

  static _calculateStandardizedTestPoints(rule, facts) {
    const text = normalizeText(
      `${facts.certificateTitle || ''} ${facts.eventName || ''} ${facts.subcategory || ''} ${facts.relevantText || ''} ${facts.achievement || ''} ${facts.position || ''} ${facts.standardizedTestScore || ''} ${facts.score || ''}`
    );
    const rawScore = facts.standardizedTestScore || facts.score || facts.position || '';
    const scoreNum = parseFloat(String(rawScore).replace(/[^0-9.]/g, '')) || 0;

    // TOEFL iBT: >=105 (30), 95-104 (25), 80-94 (20)
    if (text.includes('toefl')) {
      if (scoreNum >= 105 || text.includes('105') || text.includes('110') || text.includes('115') || text.includes('120')) return 30;
      if (scoreNum >= 95 || text.includes('95') || text.includes('100')) return 25;
      if (scoreNum >= 80 || text.includes('80') || text.includes('85') || text.includes('90')) return 20;
      return 20;
    }

    // IELTS: Band >=7.5 (30), 7.0 (25), 6.5 (20)
    if (text.includes('ielts')) {
      if (scoreNum >= 7.5 || text.includes('7.5') || text.includes('8.0') || text.includes('8.5') || text.includes('9.0') || text.includes('band 8') || text.includes('band 9')) return 30;
      if (scoreNum >= 7.0 || text.includes('7.0') || text.includes('band 7')) return 25;
      if (scoreNum >= 6.5 || text.includes('6.5') || text.includes('band 6.5')) return 20;
      return 20;
    }

    // PTE Academic: >=76 (30), 65-75 (25), 58-64 (20)
    if (text.includes('pte')) {
      if (scoreNum >= 76 || text.includes('76') || text.includes('80') || text.includes('85')) return 30;
      if (scoreNum >= 65 || text.includes('65') || text.includes('70')) return 25;
      if (scoreNum >= 58 || text.includes('58') || text.includes('60')) return 20;
      return 20;
    }

    // Cambridge BEC: Higher C1 (25), Vantage B2 (20), Preliminary B1 (15)
    if (text.includes('bec') || text.includes('cambridge')) {
      if (text.includes('higher') || text.includes('c1')) return 25;
      if (text.includes('vantage') || text.includes('b2')) return 20;
      if (text.includes('preliminary') || text.includes('b1')) return 15;
      return 20;
    }

    // GRE: >=320 (30), 310-319 (25), 300-309 (20)
    if (text.includes('gre')) {
      if (scoreNum >= 320 || text.includes('320') || text.includes('325') || text.includes('330')) return 30;
      if (scoreNum >= 310 || text.includes('310') || text.includes('315')) return 25;
      if (scoreNum >= 300 || text.includes('300') || text.includes('305')) return 20;
      return 20;
    }

    // GATE: AIR <= 5000 (30), 5001-15000 (25), Qualified (20)
    if (text.includes('gate')) {
      if (scoreNum > 0 && scoreNum <= 5000) return 30;
      if (scoreNum > 5000 && scoreNum <= 15000) return 25;
      if (text.includes('qualified') || text.includes('valid gate score') || scoreNum > 0) return 20;
      return 20;
    }

    // CAT: >=95% (30), 90-94% (25), 85-89% (20)
    if (text.includes('cat')) {
      if (scoreNum >= 95 || text.includes('95') || text.includes('98') || text.includes('99')) return 30;
      if (scoreNum >= 90 || text.includes('90') || text.includes('92')) return 25;
      if (scoreNum >= 85 || text.includes('85') || text.includes('88')) return 20;
      return 20;
    }

    // GMAT: >=700 (30), 650-699 (25), 600-649 (20)
    if (text.includes('gmat')) {
      if (scoreNum >= 700 || text.includes('700') || text.includes('720') || text.includes('750')) return 30;
      if (scoreNum >= 650 || text.includes('650') || text.includes('680')) return 25;
      if (scoreNum >= 600 || text.includes('600') || text.includes('620')) return 20;
      return 20;
    }

    return 20;
  }

  static _extractHours(durationStr) {
    if (!durationStr) return 0;
    const match = durationStr.match(/(\d+)\s*(?:hour|hr|hrs)/i);
    if (match) return parseInt(match[1], 10);
    return 0;
  }
}


