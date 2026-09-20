import mongoose from 'mongoose';
import { StorageProvider } from './StorageProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MongoDB GridFS Storage Provider
 * Persists certificate files directly in MongoDB Atlas with zero external infrastructure dependencies.
 * Perfect for Render deployments where ephemeral filesystems cannot retain local files.
 */
export class GridFSStorageProvider extends StorageProvider {
  constructor(bucketName = 'certificates') {
    super();
    this.bucketName = bucketName;
    this._bucket = null;
  }

  /**
   * Lazy-initialize the GridFSBucket from the active Mongoose connection
   */
  _getBucket() {
    if (this._bucket) {
      return this._bucket;
    }
    if (!mongoose.connection || mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      throw new Error('MongoDB connection is not established for GridFS file operations.');
    }
    this._bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: this.bucketName
    });
    return this._bucket;
  }

  /**
   * Save a certificate file buffer into MongoDB GridFS
   */
  async saveFile({ buffer, filename, mimeType, userId }) {
    const bucket = this._getBucket();
    const fileId = new mongoose.Types.ObjectId();
    const safeFilename = `${userId || 'student'}_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(fileId, safeFilename, {
        contentType: mimeType,
        metadata: {
          userId: userId ? userId.toString() : null,
          originalFilename: filename,
          mimeType,
          uploadedAt: new Date()
        }
      });

      uploadStream.on('error', (err) => {
        logger.error(`GridFS upload error for ${filename}: ${err.message}`);
        reject(err);
      });

      uploadStream.on('finish', () => {
        const storageKey = fileId.toString();
        resolve({
          storageKey,
          url: `/api/certificates/${storageKey}/file`
        });
      });

      uploadStream.end(buffer);
    });
  }

  /**
   * Retrieve certificate file buffer from MongoDB GridFS
   */
  async getFile(storageKey) {
    const bucket = this._getBucket();

    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(storageKey);
    } catch {
      throw new Error(`Invalid GridFS storage key: ${storageKey}`);
    }

    return new Promise((resolve, reject) => {
      const chunks = [];
      const downloadStream = bucket.openDownloadStream(objectId);

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('error', (err) => {
        logger.error(`GridFS read error for key ${storageKey}: ${err.message}`);
        reject(err);
      });

      downloadStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Delete certificate file from MongoDB GridFS
   */
  async deleteFile(storageKey) {
    try {
      const bucket = this._getBucket();
      const objectId = new mongoose.Types.ObjectId(storageKey);
      await bucket.delete(objectId);
      return true;
    } catch (err) {
      logger.warn(`Failed to delete GridFS file ${storageKey}: ${err.message}`);
      return false;
    }
  }

  /**
   * Get file access URL
   */
  getUrl(storageKey) {
    return `/api/certificates/${storageKey}/file`;
  }
}
