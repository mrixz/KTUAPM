import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider } from './StorageProvider.js';

export class LocalStorageProvider extends StorageProvider {
  constructor(uploadDir) {
    super();
    this.uploadDir = uploadDir || path.resolve(process.cwd(), 'uploads');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fsSync.existsSync(this.uploadDir)) {
      fsSync.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile({ buffer, filename, mimeType, userId }) {
    this._ensureDir();
    const ext = path.extname(filename) || '.pdf';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const storageKey = `${userId || 'anon'}_${Date.now()}_${randomHex}${ext}`;
    const filePath = path.join(this.uploadDir, storageKey);

    await fs.writeFile(filePath, buffer);
    return {
      storageKey,
      url: `/uploads/${storageKey}`
    };
  }

  async getFile(storageKey) {
    // Sanitize storageKey to prevent path traversal
    const safeKey = path.basename(storageKey);
    const filePath = path.join(this.uploadDir, safeKey);
    return fs.readFile(filePath);
  }

  async deleteFile(storageKey) {
    try {
      const safeKey = path.basename(storageKey);
      const filePath = path.join(this.uploadDir, safeKey);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(storageKey) {
    const safeKey = path.basename(storageKey);
    return `/uploads/${safeKey}`;
  }

  getFilePath(storageKey) {
    const safeKey = path.basename(storageKey);
    return path.join(this.uploadDir, safeKey);
  }
}
