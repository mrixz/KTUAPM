import { StudentProfile } from '../models/StudentProfile.js';
import { Certificate } from '../models/Certificate.js';
import { SchemeResolver } from '../services/scheme/SchemeResolver.js';
import { AnalyticsEngine } from '../services/analytics/AnalyticsEngine.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.'
      });
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { registerNumber, branch, program = 'B.Tech', admissionYear, entryType = 'regular' } = req.body;
    let profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile) {
      // If profile is missing for an existing user, allow creating/completing it safely
      if (!registerNumber || !admissionYear) {
        return res.status(400).json({
          success: false,
          message: 'Student profile missing. Please provide registerNumber and admissionYear to complete your profile.'
        });
      }

      const cleanReg = registerNumber.toUpperCase().trim();
      const existingReg = await StudentProfile.findOne({ registerNumber: cleanReg });
      if (existingReg && existingReg.userId.toString() !== req.user._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'KTU Register Number already belongs to another account.'
        });
      }

      const resolved = SchemeResolver.resolveScheme({
        admissionYear: parseInt(admissionYear, 10),
        entryType: entryType.toLowerCase(),
        program: (program || 'B.Tech').trim(),
        branch: (branch || 'Computer Science and Engineering').trim()
      });

      profile = await StudentProfile.create({
        userId: req.user._id,
        registerNumber: cleanReg,
        program: (program || 'B.Tech').trim(),
        branch: (branch || 'Computer Science and Engineering').trim(),
        admissionYear: parseInt(admissionYear, 10),
        entryType: resolved.entryType,
        scheme: resolved.scheme,
        ruleVersion: resolved.ruleVersion,
        requiredPoints: resolved.requiredPoints,
        maximumPoints: resolved.maximumPoints,
        creditsRequired: resolved.mandatoryCredits || (resolved.scheme === '2024' ? 3 : 2),
        joiningSemester: resolved.joiningSemester || (resolved.entryType === 'lateral' ? 3 : 1),
        groupRequirements: resolved.groupRequirements || null
      });

      return res.status(201).json({
        success: true,
        message: 'Student academic profile created successfully.',
        profile
      });
    }

    if (branch) profile.branch = branch.trim();
    if (program) profile.program = program.trim();
    if (registerNumber) profile.registerNumber = registerNumber.toUpperCase().trim();

    if (admissionYear || entryType) {
      const newYear = admissionYear ? parseInt(admissionYear, 10) : profile.admissionYear;
      const newEntry = entryType ? entryType.toLowerCase() : profile.entryType;

      // Re-resolve scheme server-side
      const resolved = SchemeResolver.resolveScheme({
        admissionYear: newYear,
        entryType: newEntry,
        program: profile.program,
        branch: profile.branch
      });

      profile.admissionYear = newYear;
      profile.entryType = resolved.entryType;
      profile.scheme = resolved.scheme;
      profile.ruleVersion = resolved.ruleVersion;
      profile.requiredPoints = resolved.requiredPoints;
      profile.maximumPoints = resolved.maximumPoints;
      profile.creditsRequired = resolved.mandatoryCredits || (resolved.scheme === '2024' ? 3 : 2);
      profile.joiningSemester = resolved.joiningSemester || (resolved.entryType === 'lateral' ? 3 : 1);
      profile.groupRequirements = resolved.groupRequirements || null;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Student academic profile updated.',
      profile
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.'
      });
    }

    const certificates = await Certificate.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: profile,
      certificates
    });

    res.status(200).json({
      success: true,
      profile,
      analytics,
      recentCertificates: certificates.slice(0, 5)
    });
  } catch (err) {
    next(err);
  }
};
