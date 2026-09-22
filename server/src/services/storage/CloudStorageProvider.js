import { StorageProvider } from './StorageProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Cloud Storage Provider (Cloudinary / AWS S3 / Object Storage)
 */
export class CloudStorageProvider extends StorageProvider {
  constructor(options = {}) {
    super();
    this.providerType = options.type || (config.cloudinary.cloudName ? 'cloudinary' : 's3');
    this.bucket = options.bucket || config.s3.bucket || 'ktu-activity-certificates';
    this.region = options.region || config.s3.region || 'ap-south-1';
    this.cloudinary = config.cloudinary;
  }

  async saveFile({ buffer, filename, mimeType, userId }) {
    // 1. Cloudinary upload if Cloudinary credentials exist
    if (this.cloudinary.cloudName && this.cloudinary.apiKey && this.cloudinary.apiSecret) {
      try {
        const isPdf =
          (mimeType && (
            mimeType.toLowerCase() === 'application/pdf' ||
            mimeType.toLowerCase() === 'application/x-pdf'
          )) ||
          (filename && filename.toLowerCase().endsWith('.pdf'));

        const resourceType = isPdf ? 'raw' : 'image';
        const timestamp = Math.round(Date.now() / 1000);
        const folder = `ktu_certificates/${userId || 'students'}`;
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}${this.cloudinary.apiSecret}`;
        const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

        const formData = new FormData();
        const blobType = mimeType || (isPdf ? 'application/pdf' : 'image/jpeg');
        const blob = new Blob([buffer], { type: blobType });
        formData.append('file', blob, filename);
        formData.append('api_key', this.cloudinary.apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${this.cloudinary.cloudName}/${resourceType}/upload`,
          { method: 'POST', body: formData }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Cloudinary upload failed: ${errText}`);
        }

        const data = await res.json();
        return {
          storageKey: data.secure_url || data.url,
          url: data.secure_url || data.url
        };
      } catch (err) {
        logger.error(`Cloudinary upload error: ${err.message}.`);
        throw err;
      }
    }

    // 2. S3 / Cloud fallback stub
    const storageKey = `certs/${userId || 'anon'}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
    return { storageKey, url };
  }

  async getFile(storageKey) {
    // If storageKey is a complete HTTP URL (e.g. Cloudinary or S3 URL), fetch the buffer directly
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      const res = await fetch(storageKey);
      if (!res.ok) {
        throw new Error(`Failed to fetch remote certificate file: HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // Otherwise construct S3 URL
    const url = this.getUrl(storageKey);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Cloud storage getFile failed for key ${storageKey}: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(storageKey) {
    return true;
  }

  getUrl(storageKey) {
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }
}
