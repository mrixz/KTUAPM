import { ruleLoader } from '../rules/ruleLoader.js';
import { OpportunityAdvisor } from './OpportunityAdvisor.js';
import { PROCESSING_STATUS } from '../../config/constants.js';

export class AnalyticsEngine {
  /**
   * Compute comprehensive, scheme-aware, entry-type-aware analytics for a student
   * @param {Object} params
   * @param {Object} params.studentProfile
   * @param {Array<Object>} params.certificates
   * @returns {Object}
   */
  static generateAnalytics({ studentProfile, certificates }) {
    const {
      scheme,
      entryType,
      ruleVersion,
      requiredPoints = 100,
      maximumPoints = 100,
      admissionYear = 2022
    } = studentProfile;

    const ruleSet = ruleLoader.getRuleSet(scheme, ruleVersion) || ruleLoader.getRuleSet(scheme);
    const allCategories = ruleSet ? ruleSet.categories : [];

    // 1. Certificate Status Counts
    const statusCounts = {
      total: certificates.length,
      counted: 0,
      processing: 0,
      insufficientEvidence: 0,
      notEligible: 0,
      duplicate: 0,
      failed: 0,
      // Legacy aliases for UI backwards compatibility
      needsReview: 0,
      rejected: 0
    };

    certificates.forEach((cert) => {
      switch (cert.processingStatus) {
        case PROCESSING_STATUS.COUNTED:
          statusCounts.counted++;
          break;
        case PROCESSING_STATUS.PROCESSING:
          statusCounts.processing++;
          break;
        case PROCESSING_STATUS.INSUFFICIENT_EVIDENCE:
        case 'LOW_CONFIDENCE':
        case 'NEEDS_REVIEW':
          statusCounts.insufficientEvidence++;
          statusCounts.needsReview++;
          break;
        case PROCESSING_STATUS.NOT_ELIGIBLE:
        case 'REJECTED':
          statusCounts.notEligible++;
          statusCounts.rejected++;
          break;
        case PROCESSING_STATUS.DUPLICATE:
          statusCounts.duplicate++;
          break;
        case PROCESSING_STATUS.FAILED:
          statusCounts.failed++;
          break;
        default:
          break;
      }
    });

    // 2. Point Calculations from COUNTED certificates
    const countedCerts = certificates.filter(
      (c) => c.processingStatus === PROCESSING_STATUS.COUNTED
    );

    const currentPoints = countedCerts.reduce((sum, c) => sum + (c.finalPoints || 0), 0);
    const remainingPoints = Math.max(0, requiredPoints - currentPoints);
    const completionPercentage = Math.min(100, Number(((currentPoints / requiredPoints) * 100).toFixed(1)));

    // 3. Category Breakdown & Cap Utilization
    const categoryStats = [];
    const categoryEarnedMap = {};

    countedCerts.forEach((cert) => {
      const cat = cert.activityCategory || 'Other';
      categoryEarnedMap[cat] = (categoryEarnedMap[cat] || 0) + (cert.finalPoints || 0);
    });

    allCategories.forEach((catDef) => {
      const cap = catDef.categoryCap ? (catDef.categoryCap[entryType] ?? 40) : (ruleSet?.academicRequirements?.[entryType]?.maximumPoints ?? 100);
      const earned =
        categoryEarnedMap[catDef.name] ||
        categoryEarnedMap[catDef.id] ||
        categoryEarnedMap[catDef.code] ||
        0;

      const remainingCapacity = Math.max(0, cap - earned);
      const utilization = Math.min(100, Number(((earned / cap) * 100).toFixed(1)));
      const contributionPercent = currentPoints > 0 ? Number(((earned / currentPoints) * 100).toFixed(1)) : 0;

      categoryStats.push({
        id: catDef.id,
        code: catDef.code,
        name: catDef.name,
        earnedPoints: earned,
        categoryCap: cap,
        remainingCapacity,
        utilizationPercentage: utilization,
        contributionPercentage: contributionPercent
      });
    });

    // 4. 2024 Group Minimums Evaluation (Group I, II, III)
    let groupStats = null;
    let allGroupMinimumsMet = true;

    if (scheme === '2024') {
      const groupMinReq =
        entryType === 'lateral' ? 30 : entryType === 'pwd' ? 20 : 40;

      const groupTotals = { group_1: 0, group_2: 0, group_3: 0 };
      categoryStats.forEach((cat) => {
        if (groupTotals[cat.id] !== undefined) {
          groupTotals[cat.id] += cat.earnedPoints;
        }
      });

      const groupDefinitions = [
        {
          groupId: 'group_1',
          groupName: 'GROUP I: Sports, Arts & Cultural Activities',
          earnedPoints: groupTotals.group_1,
          minRequiredPoints: groupMinReq,
          isMet: groupTotals.group_1 >= groupMinReq,
          shortfall: Math.max(0, groupMinReq - groupTotals.group_1),
          statusIndicator: groupTotals.group_1 >= groupMinReq ? '✓' : '⚠️'
        },
        {
          groupId: 'group_2',
          groupName: 'GROUP II: Technical Events, Competitions & Academic Presentations',
          earnedPoints: groupTotals.group_2,
          minRequiredPoints: groupMinReq,
          isMet: groupTotals.group_2 >= groupMinReq,
          shortfall: Math.max(0, groupMinReq - groupTotals.group_2),
          statusIndicator: groupTotals.group_2 >= groupMinReq ? '✓' : '⚠️'
        },
        {
          groupId: 'group_3',
          groupName: 'GROUP III: Industry Exposure, Academic Projects & Internships',
          earnedPoints: groupTotals.group_3,
          minRequiredPoints: groupMinReq,
          isMet: groupTotals.group_3 >= groupMinReq,
          shortfall: Math.max(0, groupMinReq - groupTotals.group_3),
          statusIndicator: groupTotals.group_3 >= groupMinReq ? '✓' : '⚠️'
        }
      ];

      allGroupMinimumsMet = groupDefinitions.every((g) => g.isMet);
      groupStats = groupDefinitions;
    }

    // 5. Time Series: Monthly Points & Cumulative Growth
    const sortedCerts = [...countedCerts].sort((a, b) => {
      const dateA = new Date(a.certificateDate || a.uploadedAt).getTime();
      const dateB = new Date(b.certificateDate || b.uploadedAt).getTime();
      return dateA - dateB;
    });

    const monthlyMap = {};
    let runningTotal = 0;
    const cumulativeGrowth = [];

    sortedCerts.forEach((cert) => {
      const date = new Date(cert.certificateDate || cert.uploadedAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;

      monthlyMap[monthYear] = (monthlyMap[monthYear] || 0) + (cert.finalPoints || 0);

      runningTotal += cert.finalPoints || 0;
      cumulativeGrowth.push({
        date: date.toISOString().split('T')[0],
        formattedDate: monthYear,
        pointsAwarded: cert.finalPoints || 0,
        cumulativePoints: runningTotal,
        certificateTitle: cert.certificateTitle || cert.originalFilename
      });
    });

    const monthlyTrend = Object.keys(monthlyMap).map((m) => ({
      month: m,
      points: monthlyMap[m]
    }));

    // 6. Semester Points Progression (Estimating semesters from admissionYear)
    const semesterMap = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0, S7: 0, S8: 0 };
    countedCerts.forEach((cert) => {
      const date = new Date(cert.certificateDate || cert.uploadedAt);
      const certYear = date.getFullYear();
      const certMonth = date.getMonth();
      const yearDiff = certYear - admissionYear;

      let semesterIndex = 1;
      if (yearDiff >= 0 && yearDiff <= 4) {
        const isSpring = certMonth < 6;
        semesterIndex = Math.max(1, Math.min(8, yearDiff * 2 + (isSpring ? 2 : 1)));
      }

      const semKey = `S${semesterIndex}`;
      semesterMap[semKey] = (semesterMap[semKey] || 0) + (cert.finalPoints || 0);
    });

    const semesterTrend = Object.keys(semesterMap).map((sem) => ({
      semester: sem,
      points: semesterMap[sem]
    }));

    // 7. Remaining Point Opportunities
    const opportunities = OpportunityAdvisor.getOpportunities({
      studentProfile,
      certificates
    });

    return {
      scheme,
      entryType,
      ruleVersion,
      overview: {
        currentPoints,
        requiredPoints,
        maximumPoints,
        remainingPoints,
        completionPercentage,
        allGroupMinimumsMet,
        statusCounts
      },
      categoryStats,
      groupStats,
      timeline: {
        monthlyTrend,
        semesterTrend,
        cumulativeGrowth
      },
      opportunities
    };
  }
}

