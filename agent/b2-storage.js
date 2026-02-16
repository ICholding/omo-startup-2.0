/**
 * Backblaze B2 Direct Storage Module
 * Cloud storage with direct API integration
 * 
 * Features:
 * - Direct file upload/download
 * - Public/private URL generation
 * - File listing and management
 * - Batch operations
 * - Progress tracking
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const VisualFeedback = require('./visual-feedback');

class B2Storage {
  constructor(config = {}) {
    this.keyId = config.keyId || process.env.B2_APPLICATION_KEY_ID;
    this.key = config.key || process.env.B2_APPLICATION_KEY;
    this.bucketName = config.bucketName || process.env.B2_BUCKET_NAME || 'omo-LLM';
    this.bucketId = config.bucketId || process.env.B2_BUCKET_ID;
    
    this.authToken = null;
    this.apiUrl = null;
    this.downloadUrl = null;
    this.authorized = false;
  }

  /**
   * Authorize with B2 API
   */
  async authorize() {
    if (this.authorized) return true;

    if (!this.keyId || !this.key) {
      throw new Error('B2 credentials not configured. Set B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY');
    }

    try {
      console.log(VisualFeedback.info('Authorizing with Backblaze B2...', 'cloud'));
      
      const authString = Buffer.from(`${this.keyId}:${this.key}`).toString('base64');
      const response = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
          'Authorization': `Basic ${authString}`
        }
      });

      this.authToken = response.data.authorizationToken;
      this.apiUrl = response.data.apiUrl;
      this.downloadUrl = response.data.downloadUrl;
      this.authorized = true;

      // Get bucket ID if not provided
      if (!this.bucketId) {
        await this.getBucketId();
      }

      console.log(VisualFeedback.success('B2 authorization successful'));
      return true;
    } catch (error) {
      console.error(VisualFeedback.error('B2 authorization failed', error.message));
      throw error;
    }
  }

  /**
   * Get bucket ID from bucket name
   */
  async getBucketId() {
    await this.ensureAuthorized();

    try {
      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_list_buckets`, {
        accountId: this.keyId
      }, {
        headers: { 'Authorization': this.authToken }
      });

      const bucket = response.data.buckets.find(b => b.bucketName === this.bucketName);
      if (bucket) {
        this.bucketId = bucket.bucketId;
        return bucket.bucketId;
      }
      throw new Error(`Bucket '${this.bucketName}' not found`);
    } catch (error) {
      console.error('Failed to get bucket ID:', error.message);
      throw error;
    }
  }

  /**
   * Ensure authorized before operations
   */
  async ensureAuthorized() {
    if (!this.authorized) {
      await this.authorize();
    }
  }

  /**
   * Get upload URL for direct uploads
   */
  async getUploadUrl() {
    await this.ensureAuthorized();

    try {
      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_get_upload_url`, {
        bucketId: this.bucketId
      }, {
        headers: { 'Authorization': this.authToken }
      });

      return {
        uploadUrl: response.data.uploadUrl,
        uploadAuthToken: response.data.authorizationToken
      };
    } catch (error) {
      console.error('Failed to get upload URL:', error.message);
      throw error;
    }
  }

  /**
   * Upload file directly to B2
   * @param {string} filePath - Local file path
   * @param {string} remoteName - Remote file name/path
   * @param {Object} options - Upload options
   */
  async uploadFile(filePath, remoteName = null, options = {}) {
    await this.ensureAuthorized();

    const fileName = remoteName || path.basename(filePath);
    const fullRemotePath = options.folder ? `${options.folder}/${fileName}` : fileName;

    try {
      console.log(VisualFeedback.info(`Uploading ${path.basename(filePath)}...`, 'upload'));

      // Read file
      const fileData = await fs.readFile(filePath);
      const fileSize = fileData.length;
      
      // Calculate SHA1 hash
      const hash = crypto.createHash('sha1').update(fileData).digest('hex');

      // Get upload URL
      const { uploadUrl, uploadAuthToken } = await this.getUploadUrl();

      // Upload file
      const response = await axios.post(uploadUrl, fileData, {
        headers: {
          'Authorization': uploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(fullRemotePath),
          'Content-Type': options.contentType || 'application/octet-stream',
          'Content-Length': fileSize,
          'X-Bz-Content-Sha1': hash,
          'X-Bz-Info-Author': options.author || 'ICholding-Agent',
          'X-Bz-Info-Upload-Time': new Date().toISOString()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      const result = {
        success: true,
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        fileSize: response.data.contentLength,
        uploadTimestamp: response.data.uploadTimestamp,
        sha1: hash
      };

      console.log(VisualFeedback.success(`Uploaded ${fileName} (${this.formatBytes(fileSize)})`));
      return result;
    } catch (error) {
      console.error(VisualFeedback.error(`Upload failed: ${fileName}`, error.message));
      throw error;
    }
  }

  /**
   * Upload from buffer/memory
   * @param {Buffer} buffer - File data
   * @param {string} remoteName - Remote file name
   * @param {Object} options - Upload options
   */
  async uploadBuffer(buffer, remoteName, options = {}) {
    await this.ensureAuthorized();

    try {
      console.log(VisualFeedback.info(`Uploading ${remoteName}...`, 'upload'));

      const fileSize = buffer.length;
      const hash = crypto.createHash('sha1').update(buffer).digest('hex');

      const { uploadUrl, uploadAuthToken } = await this.getUploadUrl();

      const response = await axios.post(uploadUrl, buffer, {
        headers: {
          'Authorization': uploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(remoteName),
          'Content-Type': options.contentType || 'application/octet-stream',
          'Content-Length': fileSize,
          'X-Bz-Content-Sha1': hash,
          'X-Bz-Info-Author': options.author || 'ICholding-Agent'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      console.log(VisualFeedback.success(`Uploaded ${remoteName} (${this.formatBytes(fileSize)})`));
      
      return {
        success: true,
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        fileSize: fileSize,
        sha1: hash
      };
    } catch (error) {
      console.error(VisualFeedback.error(`Upload failed: ${remoteName}`, error.message));
      throw error;
    }
  }

  /**
   * Download file from B2
   * @param {string} fileName - Remote file name
   * @param {string} downloadPath - Local download path
   * @param {Object} options - Download options
   */
  async downloadFile(fileName, downloadPath, options = {}) {
    await this.ensureAuthorized();

    try {
      console.log(VisualFeedback.info(`Downloading ${fileName}...`, 'download'));

      // Get download authorization
      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_download_file_by_name`, null, {
        headers: { 'Authorization': this.authToken },
        params: {
          bucketName: this.bucketName,
          fileName: fileName
        },
        responseType: 'arraybuffer'
      });

      await fs.writeFile(downloadPath, response.data);

      const size = response.data.length;
      console.log(VisualFeedback.success(`Downloaded ${fileName} (${this.formatBytes(size)})`));

      return {
        success: true,
        fileName,
        downloadPath,
        size
      };
    } catch (error) {
      console.error(VisualFeedback.error(`Download failed: ${fileName}`, error.message));
      throw error;
    }
  }

  /**
   * List files in bucket
   * @param {string} folder - Folder prefix to filter
   * @param {Object} options - List options
   */
  async listFiles(folder = '', options = {}) {
    await this.ensureAuthorized();

    try {
      const prefix = folder ? `${folder}/` : '';
      const maxFiles = options.maxFiles || 100;

      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_list_file_names`, {
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxFiles,
        startFileName: options.startFileName || undefined
      }, {
        headers: { 'Authorization': this.authToken }
      });

      const files = response.data.files.map(file => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileSize: file.contentLength,
        uploadTimestamp: file.uploadTimestamp,
        contentType: file.contentType,
        sha1: file.contentSha1
      }));

      console.log(VisualFeedback.info(`Found ${files.length} files${folder ? ` in ${folder}` : ''}`, 'folder'));

      return {
        files,
        nextFileName: response.data.nextFileName
      };
    } catch (error) {
      console.error('Failed to list files:', error.message);
      throw error;
    }
  }

  /**
   * Delete file from B2
   * @param {string} fileName - File name to delete
   * @param {string} fileId - File ID (optional if fileName provided)
   */
  async deleteFile(fileName, fileId = null) {
    await this.ensureAuthorized();

    try {
      // If no fileId, get it first
      if (!fileId) {
        const list = await this.listFiles();
        const file = list.files.find(f => f.fileName === fileName);
        if (!file) {
          throw new Error(`File not found: ${fileName}`);
        }
        fileId = file.fileId;
      }

      await axios.post(`${this.apiUrl}/b2api/v2/b2_delete_file_version`, {
        fileId: fileId,
        fileName: fileName
      }, {
        headers: { 'Authorization': this.authToken }
      });

      console.log(VisualFeedback.success(`Deleted ${fileName}`));
      return { success: true, fileName, fileId };
    } catch (error) {
      console.error(VisualFeedback.error(`Delete failed: ${fileName}`, error.message));
      throw error;
    }
  }

  /**
   * Get public download URL (for public buckets)
   * @param {string} fileName - Remote file name
   */
  getPublicUrl(fileName) {
    if (!this.downloadUrl) {
      throw new Error('Not authorized. Call authorize() first.');
    }
    return `${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Get private download URL (with authorization)
   * @param {string} fileName - Remote file name
   * @param {number} validDuration - URL validity in seconds (default 3600)
   */
  async getPrivateUrl(fileName, validDuration = 3600) {
    await this.ensureAuthorized();

    try {
      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_get_download_authorization`, {
        bucketId: this.bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: validDuration
      }, {
        headers: { 'Authorization': this.authToken }
      });

      const authToken = response.data.authorizationToken;
      return `${this.downloadUrl}/file/${this.bucketName}/${encodeURIComponent(fileName)}?Authorization=${authToken}`;
    } catch (error) {
      console.error('Failed to get private URL:', error.message);
      throw error;
    }
  }

  /**
   * Upload multiple files (batch)
   * @param {Array} files - Array of {localPath, remoteName} objects
   * @param {Object} options - Batch options
   */
  async uploadBatch(files, options = {}) {
    const results = [];
    const errors = [];

    console.log(VisualFeedback.info(`Starting batch upload of ${files.length} files...`, 'upload'));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(VisualFeedback.progress(`Uploading ${i + 1}/${files.length}`, file.remoteName || path.basename(file.localPath)));
        
        const result = await this.uploadFile(file.localPath, file.remoteName, options);
        results.push(result);
      } catch (error) {
        errors.push({ file: file.localPath, error: error.message });
        if (!options.continueOnError) {
          break;
        }
      }
    }

    const status = errors.length === 0 ? 'success' : errors.length === files.length ? 'failed' : 'partial';
    
    console.log(VisualFeedback[status === 'success' ? 'success' : status === 'partial' ? 'warning' : 'error'](
      `Batch upload complete: ${results.length}/${files.length} successful`
    ));

    return {
      success: status === 'success',
      uploaded: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Sync local directory to B2
   * @param {string} localDir - Local directory path
   * @param {string} remoteFolder - Remote folder name
   * @param {Object} options - Sync options
   */
  async syncDirectory(localDir, remoteFolder, options = {}) {
    console.log(VisualFeedback.info(`Syncing ${localDir} to B2/${remoteFolder}...`, 'sync'));

    try {
      const files = await fs.readdir(localDir);
      const uploadQueue = [];

      for (const file of files) {
        const filePath = path.join(localDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          uploadQueue.push({
            localPath: filePath,
            remoteName: file
          });
        }
      }

      const result = await this.uploadBatch(uploadQueue, { folder: remoteFolder, ...options });
      
      console.log(VisualFeedback.success(`Directory sync complete: ${result.uploaded} files uploaded`));
      return result;
    } catch (error) {
      console.error(VisualFeedback.error('Directory sync failed', error.message));
      throw error;
    }
  }

  /**
   * Get file info
   * @param {string} fileName - File name
   */
  async getFileInfo(fileName) {
    await this.ensureAuthorized();

    try {
      const response = await axios.post(`${this.apiUrl}/b2api/v2/b2_get_file_info`, {
        fileName: fileName,
        bucketId: this.bucketId
      }, {
        headers: { 'Authorization': this.authToken }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get file info:', error.message);
      throw error;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    await this.ensureAuthorized();

    try {
      const list = await this.listFiles('', { maxFiles: 10000 });
      const totalSize = list.files.reduce((sum, file) => sum + file.fileSize, 0);
      
      return {
        totalFiles: list.files.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        bucketName: this.bucketName
      };
    } catch (error) {
      console.error('Failed to get stats:', error.message);
      throw error;
    }
  }
}

module.exports = B2Storage;

// Demo if run directly
if (require.main === module) {
  const b2 = new B2Storage();
  
  async function demo() {
    try {
      await b2.authorize();
      
      console.log('\n=== B2 Storage Demo ===\n');
      
      // Get stats
      console.log('1. Getting storage stats...');
      const stats = await b2.getStats();
      console.log(`   Files: ${stats.totalFiles}, Size: ${stats.totalSizeFormatted}`);
      
      // List files
      console.log('\n2. Listing files...');
      const files = await b2.listFiles();
      files.files.slice(0, 5).forEach(f => {
        console.log(`   - ${f.fileName} (${b2.formatBytes(f.fileSize)})`);
      });
      
      console.log('\n=== Demo Complete ===\n');
    } catch (error) {
      console.error('Demo failed:', error.message);
    }
  }
  
  demo();
}
