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
    ruleCapAdjustment = 0,
    studentTotalPoints,
    maxStudentPoints,
    overallAdjustment = 0,
    finalPoints,
    status,
    statusReason
  }) {
    const trace = [];

    // Step 1: Input Document Facts
    trace.push({
      step: 1,
      name: 'Document Details',
      description: 'Verified information from certificate.',
      data: {
        'Activity Category': facts.activityCategory || 'Unclassified',
        'Activity Type': facts.subcategory || 'General',
        'Course / Event': facts.eventName || 'N/A',
        'Issued by': facts.organizer || 'N/A',
        'Achievement': facts.achievement || 'Participation',
        'Level': facts.level || 'Institution / College',
        'Duration': facts.duration || 'N/A',
        'Certificate Date': facts.certificateDate || 'N/A'
      }
    });

    // Step 2: Scheme & Rule Resolution
    trace.push({
      step: 2,
      name: 'KTU Rule Evaluation',
      description: `Evaluated under KTU Scheme ${scheme} for ${entryType ? entryType.toUpperCase() : 'REGULAR'} student.`,
      data: {
        'Scheme': `KTU ${scheme}`,
        'Activity': matchedRule ? matchedRule.activityName : 'No qualifying rule match',
        'Rule Reference': matchedRule?.officialReference || (matchedRule ? `Rule ${matchedRule.ruleId}` : 'N/A')
      }
    });

    // Step 3: Base Point Allocation
    trace.push({
      step: 3,
      name: 'Activity Base Points',
      description: matchedRule
        ? `Points normally awarded for "${matchedRule.activityName}" under KTU ${scheme}: ${basePoints} points.`
        : 'Could not match qualifying activity under official rule set.',
      data: {
        'Base Points for Activity': `${basePoints} pts`,
        ...(ruleCapAdjustment !== 0 ? { 'Activity Cap Adjustment': `${ruleCapAdjustment} pts` } : {})
      }
    });

    // Step 4: Category Cap Verification
    const newCategoryTotal = currentCategoryPoints + basePoints + categoryAdjustment;
    trace.push({
      step: 4,
      name: 'Category Allowance & Limits',
      description: `Category allowance is ${categoryCap} points for ${entryType || 'regular'} entry. Total already earned in this category was ${currentCategoryPoints} pts.`,
      data: {
        'Category Allowance': `${categoryCap} pts`,
        'Category Points Before Upload': `${currentCategoryPoints} pts`,
        ...(categoryAdjustment !== 0 ? { 'Category Limit Adjustment': `${categoryAdjustment} pts` } : {}),
        'Category Total After Certificate': `${Math.min(newCategoryTotal, categoryCap)} pts`
      }
    });

    // Step 5: Final Result & Explainability
    trace.push({
      step: 5,
      name: 'Final Result',
      description: status === 'COUNTED'
        ? (finalPoints > 0
            ? `Certificate accepted. ${finalPoints} activity points awarded toward your KTU degree requirement.`
            : `Certificate accepted and verified under KTU ${scheme} rules, but your point limit was already reached. 0 additional points added.`)
        : (status === 'DUPLICATE'
            ? 'This certificate has already been submitted and counted previously.'
            : (statusReason || 'Document evaluated under official KTU regulations.')),
      data: {
        'Points Awarded': `${finalPoints} pts`,
        'Status': status === 'COUNTED' ? 'Certificate Accepted' : (status === 'DUPLICATE' ? 'Already Counted' : 'No Points Added'),
        'Reason': statusReason || 'Rule conditions satisfied.'
      }
    });

    return trace;
  }
}
