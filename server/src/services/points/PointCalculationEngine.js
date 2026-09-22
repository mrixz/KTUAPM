import { RuleEngine } from '../rules/RuleEngine.js';
import { TraceGenerator } from './traceGenerator.js';
import { PROCESSING_STATUS, CONFIDENCE_THRESHOLDS } from '../../config/constants.js';

export class PointCalculationEngine {
  /**
   * Deterministically calculate points and generate calculation trace
   * @param {Object} params
   * @param {Object} params.studentProfile
   * @param {Object} params.extractedFacts
   * @param {Array<Object>} [params.existingCertificates=[]]
   * @returns {Object} Calculation result
   */
  static calculatePoints({
    studentProfile,
    extractedFacts,
    existingCertificates = []
  }) {
    const {
      scheme,
      entryType,
      ruleVersion,
      requiredPoints = 100,
      maximumPoints = 100,
      admissionYear
    } = studentProfile;

    // 0. Fail-Safe Document Validity Guard: Posters, Flyers, and Non-Certificates receive 0 points
    if (
      extractedFacts.isCertificate === false ||
      (extractedFacts.documentType && extractedFacts.documentType !== 'certificate') ||
      extractedFacts.activityCategory === 'unclassified' ||
      !extractedFacts.activityCategory
    ) {
      const reason =
        extractedFacts.rejectionReason ||
        'Document is not a valid individual activity certificate (identified as poster, announcement, flyer, or non-qualifying material). Points default to 0.';
      const trace = TraceGenerator.buildTrace({
        facts: extractedFacts,
        scheme,
        entryType,
        ruleVersion,
        matchedRule: null,
        basePoints: 0,
        categoryCap: 0,
        currentCategoryPoints: 0,
        categoryAdjustment: 0,
        studentTotalPoints: 0,
        maxStudentPoints: maximumPoints,
        overallAdjustment: 0,
        finalPoints: 0,
        status: PROCESSING_STATUS.NOT_ELIGIBLE,
        statusReason: reason
      });

      return {
        matchedRuleId: null,
        categoryId: null,
        categoryName: 'unclassified',
        basePoints: 0,
        categoryAdjustment: 0,
        overallAdjustment: 0,
        finalPoints: 0,
        processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
        statusReason: reason,
        calculationTrace: trace
      };
    }

    // 1. Evaluate confidence
    const confidence = extractedFacts.llmConfidence ?? 0.8;
    const isLowConfidence = confidence < CONFIDENCE_THRESHOLDS.ACCEPTABLE;

    // 2. Rule matching
    const { matchedRule, category, ruleSet } = RuleEngine.matchRule({
      scheme,
      ruleVersion,
      entryType,
      facts: extractedFacts
    });

    if (!matchedRule || !category) {
      const trace = TraceGenerator.buildTrace({
        facts: extractedFacts,
        scheme,
        entryType,
        ruleVersion,
        matchedRule: null,
        basePoints: 0,
        categoryCap: 0,
        currentCategoryPoints: 0,
        categoryAdjustment: 0,
        studentTotalPoints: 0,
        maxStudentPoints: maximumPoints,
        overallAdjustment: 0,
        finalPoints: 0,
        status: PROCESSING_STATUS.INSUFFICIENT_EVIDENCE,
        statusReason: 'Document does not contain enough reliable evidence to match a valid KTU rule.'
      });

      return {
        matchedRuleId: null,
        categoryId: null,
        categoryName: null,
        basePoints: 0,
        categoryAdjustment: 0,
        overallAdjustment: 0,
        finalPoints: 0,
        processingStatus: PROCESSING_STATUS.INSUFFICIENT_EVIDENCE,
        statusReason: 'Document does not contain enough reliable evidence to match a valid KTU rule.',
        calculationTrace: trace
      };
    }

    // 3. Pre-programme date verification (General Rule vi: activities before programme start are ineligible)
    if (admissionYear && extractedFacts.certificateDate) {
      const certDate = new Date(extractedFacts.certificateDate);
      if (!isNaN(certDate.getTime())) {
        const certYear = certDate.getFullYear();
        if (certYear < admissionYear) {
          const reason = `Activities completed before joining the programme are not eligible (Certificate date ${certYear} precedes admission year ${admissionYear}).`;
          const trace = TraceGenerator.buildTrace({
            facts: extractedFacts,
            scheme,
            entryType,
            ruleVersion,
            matchedRule,
            basePoints: 0,
            categoryCap: category.categoryCap?.[entryType] ?? 40,
            currentCategoryPoints: 0,
            categoryAdjustment: 0,
            studentTotalPoints: 0,
            maxStudentPoints: maximumPoints,
            overallAdjustment: 0,
            finalPoints: 0,
            status: PROCESSING_STATUS.NOT_ELIGIBLE,
            statusReason: reason
          });

          return {
            matchedRuleId: matchedRule.ruleId,
            categoryId: category.id,
            categoryName: category.name,
            basePoints: 0,
            categoryAdjustment: 0,
            overallAdjustment: 0,
            finalPoints: 0,
            processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
            statusReason: reason,
            calculationTrace: trace
          };
        }
      }
    }

    // 4. Minimum Duration Verification
    const durationCheck = this._checkDurationEligibility(matchedRule, extractedFacts);
    if (!durationCheck.eligible) {
      const trace = TraceGenerator.buildTrace({
        facts: extractedFacts,
        scheme,
        entryType,
        ruleVersion,
        matchedRule,
        basePoints: 0,
        categoryCap: category.categoryCap?.[entryType] ?? 40,
        currentCategoryPoints: 0,
        categoryAdjustment: 0,
        studentTotalPoints: 0,
        maxStudentPoints: maximumPoints,
        overallAdjustment: 0,
        finalPoints: 0,
        status: PROCESSING_STATUS.NOT_ELIGIBLE,
        statusReason: durationCheck.reason
      });

      return {
        matchedRuleId: matchedRule.ruleId,
        categoryId: category.id,
        categoryName: category.name,
        basePoints: 0,
        categoryAdjustment: 0,
        overallAdjustment: 0,
        finalPoints: 0,
        processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
        statusReason: durationCheck.reason,
        calculationTrace: trace
      };
    }

    // 5. Compute raw base points from matrix
    let basePoints = RuleEngine.calculateBasePoints(matchedRule, extractedFacts);

    // 6. Winning vs. Participation and Level Progression Check for Same Event
    const countedCerts = existingCertificates.filter(
      (c) => c.processingStatus === PROCESSING_STATUS.COUNTED
    );

    const normEvent = (extractedFacts.eventName || '').trim().toLowerCase();
    const isNewWinning =
      (extractedFacts.achievement || '').toLowerCase().includes('winner') ||
      (extractedFacts.achievement || '').toLowerCase().includes('prize') ||
      (extractedFacts.achievement || '').toLowerCase().includes('first') ||
      (extractedFacts.achievement || '').toLowerCase().includes('second') ||
      (extractedFacts.achievement || '').toLowerCase().includes('third') ||
      (extractedFacts.achievement || '').toLowerCase().includes('position');

    if (normEvent && normEvent.length > 2 && normEvent !== 'activity' && normEvent !== 'n/a') {
      const sameEventCerts = countedCerts.filter(
        (c) => (c.eventName || '').trim().toLowerCase() === normEvent
      );

      if (sameEventCerts.length > 0) {
        const existingEventPoints = Math.max(...sameEventCerts.map((c) => c.finalPoints || 0));

        // If newly submitted certificate is merely participation, but winning or equal/higher was already awarded:
        if (!isNewWinning) {
          const reason = 'Participation points cannot be combined with winning points or duplicate certificates for the same event (General Rule i).';
          const trace = TraceGenerator.buildTrace({
            facts: extractedFacts,
            scheme,
            entryType,
            ruleVersion,
            matchedRule,
            basePoints: 0,
            categoryCap: category.categoryCap?.[entryType] ?? 40,
            currentCategoryPoints: 0,
            categoryAdjustment: 0,
            studentTotalPoints: 0,
            maxStudentPoints: maximumPoints,
            overallAdjustment: 0,
            finalPoints: 0,
            status: PROCESSING_STATUS.NOT_ELIGIBLE,
            statusReason: reason
          });

          return {
            matchedRuleId: matchedRule.ruleId,
            categoryId: category.id,
            categoryName: category.name,
            basePoints: 0,
            categoryAdjustment: 0,
            overallAdjustment: 0,
            finalPoints: 0,
            processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
            statusReason: reason,
            calculationTrace: trace
          };
        } else {
          // If new is winning, award delta if higher, otherwise 0
          if (basePoints <= existingEventPoints) {
            const reason = 'Higher or equal achievement level already awarded for this event (General Rule i).';
            const trace = TraceGenerator.buildTrace({
              facts: extractedFacts,
              scheme,
              entryType,
              ruleVersion,
              matchedRule,
              basePoints: 0,
              categoryCap: category.categoryCap?.[entryType] ?? 40,
              currentCategoryPoints: 0,
              categoryAdjustment: 0,
              studentTotalPoints: 0,
              maxStudentPoints: maximumPoints,
              overallAdjustment: 0,
              finalPoints: 0,
              status: PROCESSING_STATUS.NOT_ELIGIBLE,
              statusReason: reason
            });

            return {
              matchedRuleId: matchedRule.ruleId,
              categoryId: category.id,
              categoryName: category.name,
              basePoints: 0,
              categoryAdjustment: 0,
              overallAdjustment: 0,
              finalPoints: 0,
              processingStatus: PROCESSING_STATUS.NOT_ELIGIBLE,
              statusReason: reason,
              calculationTrace: trace
            };
          } else {
            // Delta enhancement
            basePoints = basePoints - existingEventPoints;
          }
        }
      }
    }

    // 7. Subactivity / Rule-specific Maximum Limit Check
    if (matchedRule.maxPointsPerActivity && matchedRule.maxPointsPerActivity > 0) {
      const currentRulePoints = countedCerts
        .filter((c) => c.matchedRuleId === matchedRule.ruleId)
        .reduce((sum, c) => sum + (c.finalPoints || 0), 0);

      const remainingRuleCapacity = Math.max(0, matchedRule.maxPointsPerActivity - currentRulePoints);
      if (basePoints > remainingRuleCapacity) {
        basePoints = remainingRuleCapacity;
      }
    }

    // 8. Determine Category Cap for Student's Entry Type (if applicable)
    const categoryCap = category.categoryCap ? (category.categoryCap[entryType] ?? 40) : maximumPoints;

    const currentCategoryPoints = countedCerts
      .filter((c) => c.activityCategory === category.id || c.activityCategory === category.name)
      .reduce((sum, c) => sum + (c.finalPoints || 0), 0);

    const currentTotalPoints = countedCerts.reduce(
      (sum, c) => sum + (c.finalPoints || 0),
      0
    );

    // 9. Category Cap Adjustment
    let categoryAdjustment = 0;
    let allowableCategoryPoints = basePoints;

    if (category.categoryCap && currentCategoryPoints + basePoints > categoryCap) {
      const remainingCapacity = Math.max(0, categoryCap - currentCategoryPoints);
      categoryAdjustment = -(basePoints - remainingCapacity);
      allowableCategoryPoints = remainingCapacity;
    }

    // 10. Overall Max Points Adjustment
    let overallAdjustment = 0;
    let pointsAfterCategory = basePoints + categoryAdjustment;
    let allowableTotalPoints = pointsAfterCategory;

    if (currentTotalPoints + pointsAfterCategory > maximumPoints) {
      const remainingTotalCapacity = Math.max(0, maximumPoints - currentTotalPoints);
      overallAdjustment = -(pointsAfterCategory - remainingTotalCapacity);
      allowableTotalPoints = remainingTotalCapacity;
    }

    const finalPoints = Math.max(0, allowableTotalPoints);

    // 11. Determine Final Processing Status
    let processingStatus = PROCESSING_STATUS.COUNTED;
    let statusReason = 'Rule verified and points deterministically awarded.';

    if (isLowConfidence) {
      processingStatus = PROCESSING_STATUS.INSUFFICIENT_EVIDENCE;
      statusReason = `AI confidence score (${Math.round(confidence * 100)}%) is below acceptable threshold. Insufficient evidence to award points.`;
    } else if (basePoints === 0 && finalPoints === 0) {
      processingStatus = PROCESSING_STATUS.NOT_ELIGIBLE;
      statusReason = 'Zero points awarded: subactivity or category maximum cap reached.';
    }

    // 12. Build Trace
    const trace = TraceGenerator.buildTrace({
      facts: extractedFacts,
      scheme,
      entryType,
      ruleVersion,
      matchedRule,
      basePoints,
      categoryCap,
      currentCategoryPoints,
      categoryAdjustment,
      studentTotalPoints: currentTotalPoints,
      maxStudentPoints: maximumPoints,
      overallAdjustment,
      finalPoints: processingStatus === PROCESSING_STATUS.COUNTED ? finalPoints : 0,
      status: processingStatus,
      statusReason
    });

    return {
      matchedRuleId: matchedRule.ruleId,
      categoryId: category.id,
      categoryName: category.name,
      basePoints,
      categoryAdjustment,
      overallAdjustment,
      finalPoints: processingStatus === PROCESSING_STATUS.COUNTED ? finalPoints : 0,
      processingStatus,
      statusReason,
      calculationTrace: trace
    };
  }

  /**
   * Validate minimum duration requirements per KTU regulations
   * @param {Object} matchedRule 
   * @param {Object} facts 
   * @returns {{ eligible: boolean, reason?: string }}
   */
  static _checkDurationEligibility(matchedRule, facts) {
    if (!matchedRule) return { eligible: true };
    const durationText = (facts.duration || facts.relevantText || '').toLowerCase();

    // 2024 Subactivity 2.20: Short-Term Internship (Minimum 2 Weeks or 10 Working Days)
    if (matchedRule.subActivityNo === '2.20' || matchedRule.ruleId === '2024-G2-2.20') {
      const daysMatch = durationText.match(/(\d+)\s*(?:day|days)/i);
      const weeksMatch = durationText.match(/(\d+)\s*(?:week|weeks|wk|wks)/i);
      const monthsMatch = durationText.match(/(\d+)\s*(?:month|months|mo|mos)/i);

      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        if (days < 10 && !weeksMatch && !monthsMatch) {
          return {
            eligible: false,
            reason: `Short-Term Internship under 2024 Scheme requires a minimum of 2 weeks or 10 working days (certificate indicates ${days} days).`
          };
        }
      } else if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1], 10);
        if (weeks < 2 && !monthsMatch) {
          return {
            eligible: false,
            reason: `Short-Term Internship under 2024 Scheme requires a minimum of 2 weeks (certificate indicates ${weeks} week(s)).`
          };
        }
      }
    }

    // 2019 Sl. 14: Industrial Training / Internship (at least for 5 full days)
    if (matchedRule.slNo === 14 || matchedRule.ruleId === '2019-PRO-INTERN-01') {
      const daysMatch = durationText.match(/(\d+)\s*(?:day|days)/i);
      const weeksMatch = durationText.match(/(\d+)\s*(?:week|weeks|wk|wks)/i);
      const monthsMatch = durationText.match(/(\d+)\s*(?:month|months|mo|mos)/i);

      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        if (days < 5 && !weeksMatch && !monthsMatch) {
          return {
            eligible: false,
            reason: `Industrial Training/Internship under 2019 Regulation requires at least 5 full days (certificate indicates ${days} days).`
          };
        }
      }
    }

    // 2024 Subactivity 3.3: Long-Term Internship (minimum 3.5 months)
    if (matchedRule.subActivityNo === '3.3' || matchedRule.ruleId === '2024-G3-3.3') {
      const monthsMatch = durationText.match(/(\d+(?:\.\d+)?)\s*(?:month|months|mo|mos)/i);
      const weeksMatch = durationText.match(/(\d+)\s*(?:week|weeks|wk|wks)/i);
      if (monthsMatch) {
        const months = parseFloat(monthsMatch[1]);
        if (months < 3.5) {
          return {
            eligible: false,
            reason: `Long-Term Internship under 2024 Scheme requires a minimum of 3.5 months (certificate indicates ${months} months).`
          };
        }
      } else if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1], 10);
        if (weeks < 14) {
          return {
            eligible: false,
            reason: `Long-Term Internship under 2024 Scheme requires a minimum of 3.5 months (certificate indicates ${weeks} weeks).`
          };
        }
      }
    }

    // 2024 Subactivity 2.14: Industrial Visit Coordinators (Minimum 6 Days)
    if (matchedRule.subActivityNo === '2.14' || matchedRule.ruleId === '2024-G2-2.14') {
      const daysMatch = durationText.match(/(\d+)\s*(?:day|days)/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        if (days < 6) {
          return {
            eligible: false,
            reason: `Industrial Visit Coordinators role requires a minimum duration of 6 days (certificate indicates ${days} days).`
          };
        }
      }
    }

    return { eligible: true };
  }
}
