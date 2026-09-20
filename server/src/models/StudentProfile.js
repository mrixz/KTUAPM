import mongoose from 'mongoose';
import { SCHEMES, ENTRY_TYPES } from '../config/constants.js';

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    registerNumber: {
      type: String,
      required: [true, 'KTU Register Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    program: {
      type: String,
      required: [true, 'Program is required'],
      default: 'B.Tech'
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true
    },
    admissionYear: {
      type: Number,
      required: [true, 'Admission year is required'],
      min: [2015, 'Admission year must be 2015 or later'],
      max: [2035, 'Admission year cannot be in the far future']
    },
    entryType: {
      type: String,
      enum: Object.values(ENTRY_TYPES),
      required: [true, 'Entry type is required (regular or lateral)']
    },
    // Derived server-side attributes from official rules
    scheme: {
      type: String,
      enum: Object.values(SCHEMES),
      required: true
    },
    ruleVersion: {
      type: String,
      required: true
    },
    requiredPoints: {
      type: Number,
      required: true
    },
    maximumPoints: {
      type: Number,
      required: true
    },
    creditsRequired: {
      type: Number,
      default: 2
    },
    joiningSemester: {
      type: Number,
      default: 1
    },
    groupRequirements: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
