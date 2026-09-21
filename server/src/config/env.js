import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicitly check server/.env first, then root .env, then current working directory .env
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
dotenv.config(); // Load any remaining variables from process.cwd()

const DEFAULT_JWT_SECRET = 'ktu_activity_points_dev_secret_key_change_in_production';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || '',
  allowedOrigins: process.env.ALLOWED_ORIGINS || '',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // Application URL — used to build password reset and verification links.
  // Falls back to FRONTEND_URL or standard production/local URL.
  appUrl: (process.env.APP_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://ktuapm.onrender.com' : 'http://localhost:5173')).replace(/\/+$/, ''),

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  storageProvider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.70'),

  // Cloudinary credentials (if STORAGE_PROVIDER=cloudinary)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },

  // AWS / S3-compatible credentials (if STORAGE_PROVIDER=s3 or cloud)
  s3: {
    bucket: process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET || 'ktu-activity-certificates',
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_ENDPOINT || ''
  },

  // SMTP / Transactional email
  smtp: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'KTU Activity Points <noreply@ktuapm.app>'
  }
};

// ── Production startup guard ──────────────────────────────────────────────────
// Abort immediately if running in production with a known-insecure default secret.
if (config.nodeEnv === 'production') {
  if (!config.jwtSecret || config.jwtSecret === DEFAULT_JWT_SECRET) {
    console.error('\n❌ FATAL: JWT_SECRET is not set or is still the default development value.');
    console.error('   All tokens signed with the default secret are publicly forgeable.');
    console.error('   Set JWT_SECRET to a strong 64-char random string in your production environment.\n');
    process.exit(1);
  }
}
