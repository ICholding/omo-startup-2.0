/**
 * B2 Cloud Memory System
 * Persistent memory backed by Backblaze B2 cloud storage
 * Replaces local SQLite with cloud-first architecture
 */

const B2Storage = require('./b2-storage');
const VisualFeedback = require('./visual-feedback');
const crypto = require('crypto');

class B2Memory {
  constructor(config = {}) {
    this.storage = new B2Storage(config);
    this.memoryFolder = config.memoryFolder || 'agent-memory';
    this.cache = new Map(); // Local cache for fast access
    this.syncInterval = config.syncInterval || 30000; // 30s default
    this.dirty = new Set(); // Track modified keys
    this.initialized = false;
  }

  /**
   * Initialize B2 memory system
   */
  async initialize() {
    if (this.initialized) return;

    console.log(VisualFeedback.info('Initializing B2 Cloud Memory...', 'cloud'));
    
    await this.storage.authorize();
    
    // Load existing memory from B2
    await this.syncFromCloud();
    
    // Start background sync
    this.startBackgroundSync();
    
    this.initialized = true;
    console.log(VisualFeedback.success('B2 Cloud Memory initialized', 
      `Cached ${this.cache.size} memories`));
  }

  /**
   * Get value from memory
   */
  async get(key, defaultValue = null) {
    await this.ensureInitialized();

    // Check cache first
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      // Update access metadata
      entry.accessed = Date.now();
      entry.accessCount = (entry.accessCount || 0) + 1;
      return entry.value;
    }

    // Try to load from cloud
    try {
      const cloudData = await this.loadFromCloud(key);
      if (cloudData) {
        this.cache.set(key, {
          value: cloudData.value,
          created: cloudData.created,
          modified: cloudData.modified,
          accessed: Date.now(),
          accessCount: 1,
          type: cloudData.type || 'general'
        });
        return cloudData.value;
      }
    } catch (error) {
      console.log(VisualFeedback.error(`Failed to load ${key} from cloud`, error.message));
    }

    return defaultValue;
  }

  /**
   * Set value in memory
   */
  async set(key, value, type = 'general') {
    await this.ensureInitialized();

    const now = Date.now();
    const entry = {
      value,
      type,
      created: this.cache.has(key) ? this.cache.get(key).created : now,
      modified: now,
      accessed: now,
      accessCount: (this.cache.get(key)?.accessCount || 0) + 1
    };

    this.cache.set(key, entry);
    this.dirty.add(key);

    // Immediate sync for critical types
    if (type === 'critical' || type === 'directive') {
      await this.syncKeyToCloud(key);
    }

    console.log(VisualFeedback.memory('saved', key, 
      typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50)));

    return true;
  }

  /**
   * Delete from memory
   */
  async delete(key) {
    await this.ensureInitialized();

    this.cache.delete(key);
    this.dirty.delete(key);

    try {
      await this.storage.deleteFile(`${this.memoryFolder}/${key}.json`);
      console.log(VisualFeedback.success(`Deleted memory: ${key}`));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all memories by type
   */
  async getByType(type, limit = 100) {
    await this.ensureInitialized();

    const results = [];
    for (const [key, entry] of this.cache) {
      if (entry.type === type) {
        results.push({ key, ...entry });
      }
    }

    return results
      .sort((a, b) => b.accessed - a.accessed)
      .slice(0, limit);
  }

  /**
   * Search memories
   */
  async search(query, limit = 20) {
    await this.ensureInitialized();

    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, entry] of this.cache) {
      const keyMatch = key.toLowerCase().includes(lowerQuery);
      const valueMatch = typeof entry.value === 'string' && 
                        entry.value.toLowerCase().includes(lowerQuery);
      
      if (keyMatch || valueMatch) {
        results.push({ key, ...entry });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Load specific key from cloud
   */
  async loadFromCloud(key) {
    const fileName = `${this.memoryFolder}/${key}.json`;
    const tempPath = `/tmp/b2-memory-${key}.json`;

    try {
      await this.storage.downloadFile(fileName, tempPath);
      const fs = require('fs').promises;
      const data = await fs.readFile(tempPath, 'utf8');
      await fs.unlink(tempPath).catch(() => {});
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Sync specific key to cloud
   */
  async syncKeyToCloud(key) {
    if (!this.dirty.has(key)) return;

    const entry = this.cache.get(key);
    if (!entry) return;

    const fileName = `${this.memoryFolder}/${key}.json`;
    const data = JSON.stringify({
      value: entry.value,
      type: entry.type,
      created: entry.created,
      modified: entry.modified
    }, null, 2);

    try {
      await this.storage.uploadBuffer(Buffer.from(data), fileName, {
        contentType: 'application/json',
        author: 'ICholding-Agent-Memory'
      });
      this.dirty.delete(key);
    } catch (error) {
      console.error(VisualFeedback.error(`Failed to sync ${key}`, error.message));
    }
  }

  /**
   * Sync all dirty keys to cloud
   */
  async syncToCloud() {
    if (this.dirty.size === 0) return;

    console.log(VisualFeedback.info(`Syncing ${this.dirty.size} memories to cloud...`, 'sync'));

    const promises = [];
    for (const key of this.dirty) {
      promises.push(this.syncKeyToCloud(key));
    }

    await Promise.all(promises);
    console.log(VisualFeedback.success('Cloud sync complete'));
  }

  /**
   * Load all memories from cloud
   */
  async syncFromCloud() {
    try {
      const list = await this.storage.listFiles(this.memoryFolder, { maxFiles: 10000 });
      
      console.log(VisualFeedback.info(`Loading ${list.files.length} memories from cloud...`, 'cloud'));

      for (const file of list.files) {
        const key = file.fileName.replace(`${this.memoryFolder}/`, '').replace('.json', '');
        
        // Skip if we have a newer version locally
        if (this.cache.has(key)) {
          const localEntry = this.cache.get(key);
          if (localEntry.modified > file.uploadTimestamp) {
            continue;
          }
        }

        try {
          const data = await this.loadFromCloud(key);
          if (data) {
            this.cache.set(key, {
              value: data.value,
              type: data.type || 'general',
              created: data.created,
              modified: data.modified,
              accessed: Date.now(),
              accessCount: 0
            });
          }
        } catch (error) {
          console.error(`Failed to load ${key}:`, error.message);
        }
      }

      console.log(VisualFeedback.success(`Loaded ${this.cache.size} memories`));
    } catch (error) {
      console.error(VisualFeedback.error('Failed to sync from cloud', error.message));
    }
  }

  /**
   * Start background sync
   */
  startBackgroundSync() {
    setInterval(async () => {
      await this.syncToCloud();
    }, this.syncInterval);

    // Also sync before process exit
    process.on('SIGINT', async () => {
      console.log(VisualFeedback.info('Syncing memories before exit...', 'cloud'));
      await this.syncToCloud();
      process.exit(0);
    });
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    const types = {};
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      types[entry.type] = (types[entry.type] || 0) + 1;
      totalSize += JSON.stringify(entry).length;
    }

    return {
      totalMemories: this.cache.size,
      dirtyCount: this.dirty.size,
      types,
      totalSizeBytes: totalSize,
      totalSizeFormatted: this.formatBytes(totalSize)
    };
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Format bytes
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Export all memories
   */
  async export() {
    const exportData = {};
    for (const [key, entry] of this.cache) {
      exportData[key] = entry;
    }
    return exportData;
  }

  /**
   * Import memories
   */
  async import(data, overwrite = false) {
    for (const [key, value] of Object.entries(data)) {
      if (!overwrite && this.cache.has(key)) {
        continue;
      }
      await this.set(key, value.value || value, value.type || 'general');
    }
  }
}

module.exports = B2Memory;
