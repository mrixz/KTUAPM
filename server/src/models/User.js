import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required']
    },

    // Session revocation: increment to invalidate all existing JWTs
    tokenVersion: {
      type: Number,
      default: 0
    },

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false  // never returned in normal queries
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false
    },

    // Password reset
    passwordResetToken: {
      type: String,
      default: null,
      select: false  // never returned in normal queries
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Static helper to hash password — uses configurable bcrypt rounds
userSchema.statics.hashPassword = async function (plainPassword) {
  const rounds = config.bcryptRounds || 10;
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plainPassword, salt);
};

export const User = mongoose.model('User', userSchema);
