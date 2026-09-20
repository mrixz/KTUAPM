import { StudentProfile } from '../models/StudentProfile.js';
import { Certificate } from '../models/Certificate.js';
import { AnalyticsEngine } from '../services/analytics/AnalyticsEngine.js';
import { TelemetryService } from '../services/telemetry/TelemetryService.js';

export const getOverview = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const certificates = await Certificate.find({ userId: req.user._id }).lean();
    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: profile,
      certificates
    });

    res.status(200).json({
      success: true,
      scheme: analytics.scheme,
      entryType: analytics.entryType,
      ruleVersion: analytics.ruleVersion,
      overview: analytics.overview
    });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const certificates = await Certificate.find({ userId: req.user._id }).lean();
    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: profile,
      certificates
    });

    res.status(200).json({
      success: true,
      categoryStats: analytics.categoryStats
    });
  } catch (err) {
    next(err);
  }
};

export const getTimeline = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const certificates = await Certificate.find({ userId: req.user._id }).lean();
    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: profile,
      certificates
    });

    res.status(200).json({
      success: true,
      timeline: analytics.timeline
    });
  } catch (err) {
    next(err);
  }
};

export const getOpportunities = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const certificates = await Certificate.find({ userId: req.user._id }).lean();
    const analytics = AnalyticsEngine.generateAnalytics({
      studentProfile: profile,
      certificates
    });

    res.status(200).json({
      success: true,
      opportunities: analytics.opportunities
    });
  } catch (err) {
    next(err);
  }
};

export const getTelemetryMetrics = async (req, res, next) => {
  try {
    const metrics = await TelemetryService.getAggregateMetrics({ userId: req.user._id });
    res.status(200).json({
      success: true,
      metrics
    });
  } catch (err) {
    next(err);
  }
};
