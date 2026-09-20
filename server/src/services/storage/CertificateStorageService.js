import { LocalStorageProvider } from './LocalStorageProvider.js';
import { CloudStorageProvider } from './CloudStorageProvider.js';
import { config } from '../../config/env.js';

class CertificateStorageService {
  constructor() {
    if (config.storageProvider === 'cloud') {
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
