/**
 * Generates structured, human-readable calculation traces explaining deterministic point decisions.
 */
export class TraceGenerator {
  /**
   * Format a full calculation trace
   * @param {Object} data 
   * @returns {Array<Object>}
   */
  static buildTrace({
    facts,
    scheme,
    entryType,
    ruleVersion,
    matchedRule,
    basePoints,
    categoryCap,
    currentCategoryPoints,
    categoryAdjustment,
    studentTotalPoints,
    maxStudentPoints,
    overallAdjustment,
    finalPoints,
    status,
    statusReason
  }) {
    const trace = [];

    // Step 1: Input Document Facts
    trace.push({
      step: 1,
      name: 'Document Fact Extraction',
      description: 'Extracted structured properties from the certificate via AI document analysis.',
      data: {
        certificateTitle: facts.certificateTitle || 'Unknown Document',
        activityCategory: facts.activityCategory || 'Unclassified',
        subcategory: facts.subcategory || 'General',
        eventName: facts.eventName || 'N/A',
        organizer: facts.organizer || 'N/A',
        achievement: facts.achievement || 'Participation',
        level: facts.level || 'Institution / College',
        duration: facts.duration || 'N/A',
        certificateDate: facts.certificateDate || 'N/A',
        confidenceScore: facts.llmConfidence !== undefined ? `${Math.round(facts.llmConfidence * 100)}%` : 'N/A'
      }
    });

    // Step 2: Scheme & Rule Resolution
    trace.push({
      step: 2,
      name: 'Official Rule Matching',
      description: `Evaluated against KTU Scheme ${scheme} (${ruleVersion}) for ${entryType.toUpperCase()} entry.`,
      data: {
        scheme,
        entryType,
        ruleVersion,
        matchedRuleId: matchedRule ? matchedRule.ruleId : 'NO_RULE_MATCH',
        activityName: matchedRule ? matchedRule.activityName : 'None',
        officialReference: matchedRule ? matchedRule.officialReference : 'N/A'
      }
    });

    // Step 3: Base Point Allocation
    trace.push({
      step: 3,
      name: 'Base Point Calculation',
      description: matchedRule
        ? `Applied deterministic point matrix for level "${facts.level || 'Standard'}" & achievement "${facts.achievement || 'Participation'}".`
        : 'Could not match qualifying activity under official rule set.',
      data: {
        basePointsAwarded: basePoints,
        scoringType: matchedRule?.scoringType || 'N/A'
      }
    });

    // Step 4: Category Cap Verification
    const newCategoryTotal = currentCategoryPoints + basePoints + categoryAdjustment;
    trace.push({
      step: 4,
      name: 'Category Cap Evaluation',
      description: `Category cap is ${categoryCap} points for ${entryType} entry. Current category total before this certificate was ${currentCategoryPoints} pts.`,
      data: {
        categoryCap,
        currentCategoryPoints,
        categoryAdjustment,
        postCalculationCategoryTotal: Math.min(newCategoryTotal, categoryCap)
      }
    });

    // Step 5: Final Result & Explainability
    trace.push({
      step: 5,
      name: 'Final Point Resolution',
      description: status === 'COUNTED'
        ? `Certificate successfully verified. ${finalPoints} points awarded toward official KTU activity points.`
        : `Certificate requires verification: ${statusReason || 'Incomplete or unverified criteria.'}`,
      data: {
        finalPoints,
        status,
        statusReason: statusReason || 'Rule conditions satisfied.'
      }
    });

    return trace;
  }
}
