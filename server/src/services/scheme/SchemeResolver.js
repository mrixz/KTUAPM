import { ruleLoader } from '../rules/ruleLoader.js';
import { ENTRY_TYPES } from '../../config/constants.js';

export class SchemeResolver {
  /**
   * Resolve applicable KTU scheme, rule version, and point requirements from academic profile.
   * Decouples scheme resolution from naive admissionYear checks by evaluating entry-type and curriculum applicability rules
   * configured directly in versioned rule sets.
   * 
   * Lateral entry students admitted in 2024 join Semester 3 with the 2023 regular batch,
   * thus belonging to the 2019 Regulation (75 required points).
   * Lateral entry students admitted in 2025 join Semester 3 with the 2024 regular NEP batch,
   * thus belonging to the 2024 Regulation (90 required points with min 30 per group).
   *
   * @param {Object} profile
   * @param {number|string} profile.admissionYear - Year student entered the institution
   * @param {string} [profile.entryType='regular'] - 'regular' | 'lateral' | 'pwd'
   * @param {string} [profile.curriculumRegulation] - Optional explicit curriculum/scheme override (e.g. '2019', '2024')
   * @param {string} [profile.program='B.Tech']
   * @param {string} [profile.branch]
   * @returns {Object} { scheme, entryType, ruleVersion, requiredPoints, maximumPoints, groupRequirements, mandatoryCredits, joiningSemester, description, ruleSetTitle }
   */
  static resolveScheme(profile = {}) {
    return this._doResolveScheme(profile);
  }

  static resolveContext(profile = {}) {
    return this._doResolveScheme(profile);
  }

  static resolveAcademicContext(profile = {}) {
    return this._doResolveScheme(profile);
  }

  static _doResolveScheme(profile = {}) {
    const { admissionYear, entryType = ENTRY_TYPES.REGULAR, curriculumRegulation, scheme } = profile;
    const year = admissionYear !== undefined && admissionYear !== null ? parseInt(admissionYear, 10) : null;
    const normalizedEntryType = (entryType || ENTRY_TYPES.REGULAR).toLowerCase();

    const allRuleSets = ruleLoader.getAllRuleSets();

    // 1. Explicit Curriculum Regulation / Scheme Override
    const explicitReg = curriculumRegulation || scheme;
    if (explicitReg) {
      const explicitRuleSet = ruleLoader.getRuleSet(explicitReg);
      if (explicitRuleSet) {
        const req = explicitRuleSet.academicRequirements?.[normalizedEntryType];
        if (!req) {
          throw new Error(
            `Rule set '${explicitRuleSet.scheme}' does not define academic requirements for entry type '${normalizedEntryType}'.`
          );
        }

        const result = {
          scheme: explicitRuleSet.scheme,
          entryType: normalizedEntryType,
          ruleVersion: explicitRuleSet.version,
          requiredPoints: req.requiredPoints,
          maximumPoints: req.maximumPoints,
          groupRequirements: this._normalizeGroupRequirements(req.groupRequirements),
          mandatoryCredits: req.mandatoryCredits || (explicitRuleSet.scheme === '2024' ? 3 : 2),
          joiningSemester: req.joiningSemester ?? (normalizedEntryType === ENTRY_TYPES.LATERAL ? 3 : 1),
          description: req.description || `Explicitly assigned KTU ${explicitRuleSet.scheme} regulation (${explicitRuleSet.title})`,
          ruleSetTitle: explicitRuleSet.title
        };

        this._validateResolution(result);
        return result;
      }
    }

    // Ensure rules are loaded
    if (allRuleSets.length === 0) {
      throw new Error('No KTU rule sets are currently loaded in the rule engine.');
    }

    // 2. Dynamic Evaluation of Configurable Applicability Rules across loaded rule sets
    if (year !== null && !isNaN(year)) {
      for (const ruleSet of allRuleSets) {
        const req = ruleSet.academicRequirements?.[normalizedEntryType];
        if (req) {
          const minYear = req.admissionYearMin;
          const maxYear = req.admissionYearMax;

          const isAfterMin = minYear === undefined || minYear === null || year >= minYear;
          const isBeforeMax = maxYear === undefined || maxYear === null || year <= maxYear;

          if (isAfterMin && isBeforeMax) {
            const result = {
              scheme: ruleSet.scheme,
              entryType: normalizedEntryType,
              ruleVersion: ruleSet.version,
              requiredPoints: req.requiredPoints,
              maximumPoints: req.maximumPoints,
              groupRequirements: this._normalizeGroupRequirements(req.groupRequirements),
              mandatoryCredits: req.mandatoryCredits || (ruleSet.scheme === '2024' ? 3 : 2),
              joiningSemester: req.joiningSemester ?? (normalizedEntryType === ENTRY_TYPES.LATERAL ? 3 : 1),
              description: req.description || `${normalizedEntryType} entry under KTU ${ruleSet.scheme} regulation`,
              ruleSetTitle: ruleSet.title
            };

            this._validateResolution(result);
            return result;
          }
        }
      }
    }

    // 3. Fallback to the latest loaded rule set if no specific cohort interval matched
    const defaultRuleSet = allRuleSets[allRuleSets.length - 1] || allRuleSets[0];
    const defaultReq = defaultRuleSet.academicRequirements?.[normalizedEntryType];
    const defaultRequiredPoints = defaultReq?.requiredPoints ?? (defaultRuleSet.scheme === '2024' ? (normalizedEntryType === ENTRY_TYPES.LATERAL ? 90 : 120) : (normalizedEntryType === ENTRY_TYPES.LATERAL ? 75 : 100));

    const result = {
      scheme: defaultRuleSet.scheme,
      entryType: normalizedEntryType,
      ruleVersion: defaultRuleSet.version,
      requiredPoints: defaultRequiredPoints,
      maximumPoints: defaultReq?.maximumPoints ?? defaultRequiredPoints,
      groupRequirements: this._normalizeGroupRequirements(defaultReq?.groupRequirements),
      mandatoryCredits: defaultReq?.mandatoryCredits || (defaultRuleSet.scheme === '2024' ? 3 : 2),
      joiningSemester: defaultReq?.joiningSemester ?? (normalizedEntryType === ENTRY_TYPES.LATERAL ? 3 : 1),
      description: defaultReq?.description || `Default resolved to KTU ${defaultRuleSet.scheme} regulation`,
      ruleSetTitle: defaultRuleSet.title
    };

    this._validateResolution(result);
    return result;
  }

  static _normalizeGroupRequirements(groupReq) {
    if (!groupReq) return null;
    const normalized = {};
    const names = {
      group_1: 'GROUP I: Sports, Arts & Cultural Activities',
      group_2: 'GROUP II: Technical Events, Competitions & Academic Presentations',
      group_3: 'GROUP III: Industry Exposure, Academic Projects & Internships'
    };

    for (const [key, val] of Object.entries(groupReq)) {
      if (typeof val === 'number') {
        normalized[key] = {
          name: names[key] || key.toUpperCase(),
          minPoints: val
        };
      } else if (val && typeof val === 'object') {
        normalized[key] = {
          name: val.name || names[key] || key.toUpperCase(),
          minPoints: val.minPoints ?? val.points ?? 40
        };
      }
    }
    return normalized;
  }

  /**
   * Defensive cross-check preventing cross-scheme pollution (e.g. 2024 scheme with 75 points)
   * @private
   */
  static _validateResolution(r) {
    if (r.scheme === '2024' && r.entryType === 'lateral' && r.requiredPoints !== 90) {
      throw new Error(`CRITICAL RULE ENGINE ERROR: 2024 Lateral Entry requires exactly 90 points, got ${r.requiredPoints}.`);
    }
    if (r.scheme === '2024' && r.entryType === 'regular' && r.requiredPoints !== 120) {
      throw new Error(`CRITICAL RULE ENGINE ERROR: 2024 Regular Entry requires exactly 120 points, got ${r.requiredPoints}.`);
    }
    if (r.scheme === '2019' && r.entryType === 'lateral' && r.requiredPoints !== 75) {
      throw new Error(`CRITICAL RULE ENGINE ERROR: 2019 Lateral Entry requires exactly 75 points, got ${r.requiredPoints}.`);
    }
    if (r.scheme === '2019' && r.entryType === 'regular' && r.requiredPoints !== 100) {
      throw new Error(`CRITICAL RULE ENGINE ERROR: 2019 Regular Entry requires exactly 100 points, got ${r.requiredPoints}.`);
    }
  }
}

