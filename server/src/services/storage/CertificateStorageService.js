import { LocalStorageProvider } from './LocalStorageProvider.js';
import { CloudStorageProvider } from './CloudStorageProvider.js';
import { GridFSStorageProvider } from './GridFSStorageProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

class CertificateStorageService {
  constructor() {
    this.providerType = (config.storageProvider || 'local').trim().toLowerCase();

    if (this.providerType === 'gridfs' || this.providerType === 'mongodb' || this.providerType === 'mongo') {
      this.provider = new GridFSStorageProvider();
    } else if (
      this.providerType === 'cloud' ||
      this.providerType === 'cloudinary' ||
      this.providerType === 's3' ||
      this.providerType === 'aws'
    ) {
      this.provider = new CloudStorageProvider();
    } else {
      this.provider = new LocalStorageProvider(config.uploadDir);
    }
  }

  async saveCertificate({ buffer, filename, mimeType, userId }) {
    try {
      return await this.provider.saveFile({ buffer, filename, mimeType, userId });
    } catch (err) {
      // If external cloud provider (e.g. Cloudinary, S3) fails or has invalid credentials,
      // gracefully fall back to MongoDB GridFS so student certificate upload never breaks
      if (!(this.provider instanceof GridFSStorageProvider)) {
        logger.warn(`Primary storage (${this.providerType}) failed: ${err.message}. Falling back to GridFS.`);
        if (!this._gridfsFallback) {
          this._gridfsFallback = new GridFSStorageProvider();
        }
        return await this._gridfsFallback.saveFile({ buffer, filename, mimeType, userId });
      }
      throw err;
    }
  }

  async getCertificate(storageKey) {
    try {
      return await this.provider.getFile(storageKey);
    } catch (err) {
      // 1. Try GridFS if storageKey is an ObjectId or primary provider was Cloudinary/Local
      if (storageKey && /^[0-9a-fA-F]{24}$/.test(storageKey)) {
        try {
          const gridfs = new GridFSStorageProvider();
          return await gridfs.getFile(storageKey);
        } catch (_) {}
      }
      // 2. Try LocalStorage fallback
      try {
        const local = new LocalStorageProvider(config.uploadDir);
        return await local.getFile(storageKey);
      } catch (_) {}
      // 3. Try GridFS fallback generally
      if (this._gridfsFallback) {
        try {
          return await this._gridfsFallback.getFile(storageKey);
        } catch (_) {}
      }
      throw err;
    }
  }

  async deleteCertificate(storageKey) {
    try {
      return await this.provider.deleteFile(storageKey);
    } catch (_) {
      return true;
    }
  }

  getCertificateUrl(storageKey) {
    return this.provider.getUrl(storageKey);
  }

  getFilePath(storageKey) {
    if (typeof this.provider.getFilePath === 'function') {
      return this.provider.getFilePath(storageKey);
    }
    return null;
  }
}

export const certificateStorage = new CertificateStorageService();
