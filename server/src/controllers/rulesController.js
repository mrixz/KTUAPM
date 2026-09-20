import { ruleLoader } from '../services/rules/ruleLoader.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { SchemeResolver } from '../services/scheme/SchemeResolver.js';

export const getCurrentRules = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const ruleSet = ruleLoader.getRuleSet(profile.scheme, profile.ruleVersion);
    if (!ruleSet) {
      return res.status(404).json({ success: false, message: 'Rule set not found for student scheme.' });
    }

    res.status(200).json({
      success: true,
      scheme: profile.scheme,
      entryType: profile.entryType,
      ruleVersion: profile.ruleVersion,
      ruleSet
    });
  } catch (err) {
    next(err);
  }
};

export const getAllRules = async (req, res, next) => {
  try {
    const ruleSets = ruleLoader.getAllRuleSets();
    res.status(200).json({
      success: true,
      count: ruleSets.length,
      ruleSets
    });
  } catch (err) {
    next(err);
  }
};

export const previewScheme = async (req, res, next) => {
  try {
    const { admissionYear, entryType, curriculumRegulation, program, branch } = {
      ...req.query,
      ...req.body
    };

    const resolution = SchemeResolver.resolveScheme({
      admissionYear: admissionYear ? parseInt(admissionYear, 10) : undefined,
      entryType,
      curriculumRegulation,
      program,
      branch
    });

    res.status(200).json({
      success: true,
      resolution
    });
  } catch (err) {
    next(err);
  }
};
