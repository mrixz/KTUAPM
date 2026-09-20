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

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || '',
  allowedOrigins: process.env.ALLOWED_ORIGINS || '',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'ktu_activity_points_dev_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
  }
};

