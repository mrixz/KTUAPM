import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { SchemeResolver } from '../services/scheme/SchemeResolver.js';
import { config } from '../config/env.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

const sendTokenResponse = (user, profile, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      profile
    });
};

export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      registerNumber,
      program = 'B.Tech',
      branch = 'Computer Science and Engineering',
      admissionYear,
      entryType = 'regular'
    } = req.body;

    if (!name || !email || !password || !registerNumber || !admissionYear) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, registerNumber, admissionYear).'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();

    // 1. Check if user or register number already exists
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const existingReg = await StudentProfile.findOne({ registerNumber: cleanRegNo });
    if (existingReg) {
      return res.status(409).json({
        success: false,
        message: 'A student profile with this KTU Register Number already exists.'
      });
    }

    // 2. Server-side scheme resolution from academic info (validate before persisting)
    const resolvedSchemeData = SchemeResolver.resolveScheme({
      admissionYear: parseInt(admissionYear, 10),
      entryType: (entryType || 'regular').toLowerCase(),
      program: (program || 'B.Tech').trim(),
      branch: (branch || 'Computer Science and Engineering').trim()
    });

    // 3. Hash password
    const passwordHash = await User.hashPassword(password);

    let user;
    let profile;

    // 4. Create User and StudentProfile atomically
    const session = await mongoose.startSession().catch(() => null);
    if (session) {
      try {
        await session.withTransaction(async () => {
          const createdUsers = await User.create(
            [
              {
                name: name.trim(),
                email: cleanEmail,
                passwordHash
              }
            ],
            { session }
          );
          user = createdUsers[0];

          const createdProfiles = await StudentProfile.create(
            [
              {
                userId: user._id,
                registerNumber: cleanRegNo,
                program: (program || 'B.Tech').trim(),
                branch: (branch || 'Computer Science and Engineering').trim(),
                admissionYear: parseInt(admissionYear, 10),
                entryType: resolvedSchemeData.entryType,
                scheme: resolvedSchemeData.scheme,
                ruleVersion: resolvedSchemeData.ruleVersion,
                requiredPoints: resolvedSchemeData.requiredPoints,
                maximumPoints: resolvedSchemeData.maximumPoints,
                creditsRequired: resolvedSchemeData.mandatoryCredits || (resolvedSchemeData.scheme === '2024' ? 3 : 2),
                joiningSemester: resolvedSchemeData.joiningSemester || (resolvedSchemeData.entryType === 'lateral' ? 3 : 1),
                groupRequirements: resolvedSchemeData.groupRequirements || null
              }
            ],
            { session }
          );
          profile = createdProfiles[0];
        });
      } catch (txErr) {
        throw txErr;
      } finally {
        await session.endSession().catch(() => {});
      }
    } else {
      // Non-transactional fallback with guaranteed rollback cleanup
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash
      });

      try {
        profile = await StudentProfile.create({
          userId: user._id,
          registerNumber: cleanRegNo,
          program: (program || 'B.Tech').trim(),
          branch: (branch || 'Computer Science and Engineering').trim(),
          admissionYear: parseInt(admissionYear, 10),
          entryType: resolvedSchemeData.entryType,
          scheme: resolvedSchemeData.scheme,
          ruleVersion: resolvedSchemeData.ruleVersion,
          requiredPoints: resolvedSchemeData.requiredPoints,
          maximumPoints: resolvedSchemeData.maximumPoints,
          creditsRequired: resolvedSchemeData.mandatoryCredits || (resolvedSchemeData.scheme === '2024' ? 3 : 2),
          joiningSemester: resolvedSchemeData.joiningSemester || (resolvedSchemeData.entryType === 'lateral' ? 3 : 1),
          groupRequirements: resolvedSchemeData.groupRequirements || null
        });
      } catch (profileErr) {
        // Rollback user creation to prevent orphaned accounts without student profiles
        await User.findByIdAndDelete(user._id).catch(() => {});
        throw profileErr;
      }
    }

    sendTokenResponse(user, profile, 201, res);
  } catch (err) {
    next(err);
  }
};


export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const profile = await StudentProfile.findOne({ userId: user._id });

    sendTokenResponse(user, profile, 200, res);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await StudentProfile.findOne({ userId: user._id });

    res.status(200).json({
      success: true,
      user,
      profile
    });
  } catch (err) {
    next(err);
  }
};
