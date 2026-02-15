/**
 * B2 Backblaze Storage Service
 * Handles file uploads, downloads, and management for omo-LLM bucket
 */
const B2 = require('backblaze-b2');
require('dotenv').config({ path: '.env.b2' });

const resolveEnv = (...keys) => keys.find((key) => process.env[key])
  ? process.env[keys.find((key) => process.env[key])]
  : undefined;

class B2StorageService {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: resolveEnv('B2_KEY_ID', 'BACKBLAZE_KEY_ID', 'VITE_BACKBLAZE_KEY_ID'),
      applicationKey: resolveEnv('B2_APPLICATION_KEY', 'BACKBLAZE_APPLICATION_KEY', 'VITE_BACKBLAZE_APPLICATION_KEY')
    });
    this.bucketName = resolveEnv('B2_BUCKET_NAME', 'BACKBLAZE_BUCKET_NAME', 'VITE_BACKBLAZE_BUCKET_NAME') || 'omo-LLM';
    this.bucketId = null;
    this.authorized = false;
  }

  /**
   * Initialize connection and authorize with B2
   */
  async initialize() {
    try {
      await this.b2.authorize();
      this.authorized = true;
      
      // Get bucket info
      const buckets = await this.b2.listBuckets({
        bucketName: this.bucketName
      });
      
      if (buckets.data.buckets.length > 0) {
        this.bucketId = buckets.data.buckets[0].bucketId;
        console.log(`[B2] Connected to bucket: ${this.bucketName} (${this.bucketId})`);
      } else {
        throw new Error(`Bucket ${this.bucketName} not found`);
      }
      
      return true;
    } catch (error) {
      console.error('[B2] Authorization failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload file to B2
   * @param {Buffer} fileData - File buffer
   * @param {string} fileName - Target filename
   * @param {string} contentType - MIME type
   */
  async uploadFile(fileData, fileName, contentType = 'application/octet-stream') {
    if (!this.authorized) {
      await this.initialize();
    }

    try {
      // Get upload URL
      const uploadUrl = await this.b2.getUploadUrl({
        bucketId: this.bucketId
      });

      // Upload file
      const response = await this.b2.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: fileName,
        data: fileData,
        contentType: contentType
      });

      console.log(`[B2] Uploaded: ${fileName}`);
      return {
        success: true,
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        contentLength: response.data.contentLength,
        uploadTimestamp: response.data.uploadTimestamp
      };
    } catch (error) {
      console.error(`[B2] Upload failed for ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Download file from B2
   * @param {string} fileName - Filename to download
   */
  async downloadFile(fileName) {
    if (!this.authorized) {
      await this.initialize();
    }

    try {
      const response = await this.b2.downloadFileByName({
        bucketName: this.bucketName,
        fileName: fileName,
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: response.data,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error(`[B2] Download failed for ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete file from B2
   * @param {string} fileName - Filename to delete
   * @param {string} fileId - File ID (optional)
   */
  async deleteFile(fileName, fileId = null) {
    if (!this.authorized) {
      await this.initialize();
    }

    try {
      // If fileId not provided, need to look it up
      if (!fileId) {
        const files = await this.b2.listFileNames({
          bucketId: this.bucketId,
          prefix: fileName,
          maxFileCount: 1
        });
        
        if (files.data.files.length === 0) {
          throw new Error(`File not found: ${fileName}`);
        }
        fileId = files.data.files[0].fileId;
      }

      await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: fileName
      });

      console.log(`[B2] Deleted: ${fileName}`);
      return { success: true };
    } catch (error) {
      console.error(`[B2] Delete failed for ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * List files in bucket
   * @param {string} prefix - Filter by prefix
   * @param {number} maxFiles - Maximum files to return
   */
  async listFiles(prefix = '', maxFiles = 100) {
    if (!this.authorized) {
      await this.initialize();
    }

    try {
      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxFiles
      });

      return {
        success: true,
        files: response.data.files,
        nextFileName: response.data.nextFileName
      };
    } catch (error) {
      console.error('[B2] List files failed:', error.message);
      throw error;
    }
  }

  /**
   * Get public URL for file (if bucket is public)
   * @param {string} fileName - Filename
   */
  getPublicUrl(fileName) {
    const baseUrl = process.env.B2_PUBLIC_URL || 
      `https://f000.backblazeb2.com/file/${this.bucketName}`;
    return `${baseUrl}/${encodeURIComponent(fileName)}`;
  }
}

module.exports = B2StorageService;
