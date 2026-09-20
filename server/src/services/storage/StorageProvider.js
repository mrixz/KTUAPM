/**
 * Abstract Storage Provider Interface
 */
export class StorageProvider {
  /**
   * Save a file buffer to storage
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.filename
   * @param {string} params.mimeType
   * @param {string} params.userId
   * @returns {Promise<{ storageKey: string, url: string }>}
   */
  async saveFile(params) {
    throw new Error('saveFile() must be implemented by concrete StorageProvider');
  }

  /**
   * Get file buffer by storage key
   * @param {string} storageKey
   * @returns {Promise<Buffer>}
   */
  async getFile(storageKey) {
    throw new Error('getFile() must be implemented by concrete StorageProvider');
  }

  /**
   * Delete file by storage key
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async deleteFile(storageKey) {
    throw new Error('deleteFile() must be implemented by concrete StorageProvider');
  }

  /**
   * Get public/streamable URL for a file
   * @param {string} storageKey
   * @returns {string}
   */
  getUrl(storageKey) {
    throw new Error('getUrl() must be implemented by concrete StorageProvider');
  }
}
