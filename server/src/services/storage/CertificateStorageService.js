import { LocalStorageProvider } from './LocalStorageProvider.js';
import { CloudStorageProvider } from './CloudStorageProvider.js';
import { GridFSStorageProvider } from './GridFSStorageProvider.js';
import { config } from '../../config/env.js';

class CertificateStorageService {
  constructor() {
    const providerType = (config.storageProvider || 'local').toLowerCase();

    if (providerType === 'gridfs' || providerType === 'mongodb' || providerType === 'mongo') {
      this.provider = new GridFSStorageProvider();
    } else if (
      providerType === 'cloud' ||
      providerType === 'cloudinary' ||
      providerType === 's3' ||
      providerType === 'aws'
    ) {
      this.provider = new CloudStorageProvider();
    } else {
      this.provider = new LocalStorageProvider(config.uploadDir);
    }
  }

  async saveCertificate({ buffer, filename, mimeType, userId }) {
    return this.provider.saveFile({ buffer, filename, mimeType, userId });
  }

  async getCertificate(storageKey) {
    return this.provider.getFile(storageKey);
  }

  async deleteCertificate(storageKey) {
    return this.provider.deleteFile(storageKey);
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
