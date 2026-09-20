import { ruleLoader } from '../rules/ruleLoader.js';
import { PROCESSING_STATUS } from '../../config/constants.js';

export class OpportunityAdvisor {
  /**
   * Determine available point opportunities based on official rules and student history
   * @param {Object} params
   * @param {Object} params.studentProfile
   * @param {Array<Object>} params.certificates
   * @returns {Object}
   */
  static getOpportunities({ studentProfile, certificates }) {
    const {
      scheme,
      entryType,
      ruleVersion,
      requiredPoints = 100,
      maximumPoints = 100
    } = studentProfile;

    const ruleSet = ruleLoader.getRuleSet(scheme, ruleVersion) || ruleLoader.getRuleSet(scheme);
    if (!ruleSet) {
      return {
        currentPoints: 0,
        requiredPoints,
        maximumPoints,
        remainingPoints: requiredPoints,
        groupOpportunities: null,
        categoryOpportunities: [],
        suggestedActivities: []
      };
    }

    // Only count COUNTED certificates
    const countedCerts = certificates.filter(
      (c) => c.processingStatus === PROCESSING_STATUS.COUNTED
    );

    const totalEarnedPoints = countedCerts.reduce((sum, c) => sum + (c.finalPoints || 0), 0);
    const overallRemaining = Math.max(0, requiredPoints - totalEarnedPoints);

    // Group earned points by category
    const categoryEarnedMap = {};
    for (const cert of countedCerts) {
      const catKey = cert.activityCategory || 'Other';
      categoryEarnedMap[catKey] = (categoryEarnedMap[catKey] || 0) + (cert.finalPoints || 0);
    }

    // Calculate remaining capacity per category/group from official rules
    const categoryOpportunities = [];
    const suggestedActivities = [];

    // For 2024: Calculate Group Minimum Statuses
    let groupOpportunities = null;
    if (scheme === '2024') {
      const groupMinReq = entryType === 'lateral' ? 30 : entryType === 'pwd' ? 20 : 40;
      const groupTotals = { group_1: 0, group_2: 0, group_3: 0 };

      for (const category of ruleSet.categories) {
        const earnedInCat =
          categoryEarnedMap[category.name] ||
          categoryEarnedMap[category.id] ||
          categoryEarnedMap[category.code] ||
          0;
        if (groupTotals[category.id] !== undefined) {
          groupTotals[category.id] += earnedInCat;
        }
      }

      groupOpportunities = [
        {
          groupId: 'group_1',
          groupName: 'GROUP I: Sports, Arts & Cultural Activities',
          earned: groupTotals.group_1,
          required: groupMinReq,
          stillNeeded: Math.max(0, groupMinReq - groupTotals.group_1),
          isSatisfied: groupTotals.group_1 >= groupMinReq
        },
        {
          groupId: 'group_2',
          groupName: 'GROUP II: Technical Events, Competitions & Academic Presentations',
          earned: groupTotals.group_2,
          required: groupMinReq,
          stillNeeded: Math.max(0, groupMinReq - groupTotals.group_2),
          isSatisfied: groupTotals.group_2 >= groupMinReq
        },
        {
          groupId: 'group_3',
          groupName: 'GROUP III: Industry Exposure, Academic Projects & Internships',
          earned: groupTotals.group_3,
          required: groupMinReq,
          stillNeeded: Math.max(0, groupMinReq - groupTotals.group_3),
          isSatisfied: groupTotals.group_3 >= groupMinReq
        }
      ];
    }

    for (const category of ruleSet.categories) {
      const categoryCap = category.categoryCap ? (category.categoryCap[entryType] ?? 40) : (ruleSet.academicRequirements?.[entryType]?.maximumPoints ?? 100);
      const earnedInCat =
        categoryEarnedMap[category.name] ||
        categoryEarnedMap[category.id] ||
        categoryEarnedMap[category.code] ||
        0;

      const remainingCapacity = Math.max(0, categoryCap - earnedInCat);
      const capUtilizationPercent = Math.min(100, Math.round((earnedInCat / categoryCap) * 100));

      categoryOpportunities.push({
        categoryId: category.id,
        categoryCode: category.code,
        categoryName: category.name,
        description: category.description,
        earnedPoints: earnedInCat,
        categoryCap,
        remainingCapacity,
        capUtilizationPercent,
        hasCapacity: remainingCapacity > 0,
        subcategories: category.subcategories || []
      });

      // If category has headroom, extract top actionable qualifying activities from official rules
      if (remainingCapacity > 0) {
        const catRules = ruleSet.rules.filter((r) => r.categoryId === category.id);
        for (const rule of catRules) {
          suggestedActivities.push({
            ruleId: rule.ruleId,
            categoryId: category.id,
            categoryName: category.name,
            activityName: rule.activityName,
            subcategory: rule.subcategory,
            maxPointsPerActivity: rule.maxPointsPerActivity,
            evidenceRequirements: rule.evidenceRequirements || [],
            officialReference: rule.officialReference,
            potentialPoints: Math.min(rule.maxPointsPerActivity || 20, remainingCapacity)
          });
        }
      }
    }

    return {
      currentPoints: totalEarnedPoints,
      requiredPoints,
      maximumPoints,
      remainingPoints: overallRemaining,
      completionPercentage: Math.min(100, Math.round((totalEarnedPoints / requiredPoints) * 100)),
      groupOpportunities,
      categoryOpportunities,
      suggestedActivities: suggestedActivities.slice(0, 10)
    };
  }
}

