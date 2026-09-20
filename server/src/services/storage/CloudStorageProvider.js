import { StorageProvider } from './StorageProvider.js';

/**
 * Cloud Storage Provider (S3 / Cloudinary / Supabase ready stub)
 */
export class CloudStorageProvider extends StorageProvider {
  constructor(options = {}) {
    super();
    this.bucket = options.bucket || 'ktu-activity-certificates';
    this.region = options.region || 'ap-south-1';
  }

  async saveFile({ buffer, filename, mimeType, userId }) {
    // In production, this uploads to S3 / Cloudinary using signed upload or SDK
    const storageKey = `certs/${userId}/${Date.now()}_${filename}`;
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
    return { storageKey, url };
  }

  async getFile(storageKey) {
    throw new Error('Cloud storage getFile requires AWS SDK credentials in production');
  }

  async deleteFile(storageKey) {
    return true;
  }

  getUrl(storageKey) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }
}
