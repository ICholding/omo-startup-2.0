const githubService = require('../services/github');

class AntiHallucinationMiddleware {
  constructor(options = {}) {
    this.github = options.github || githubService;
    this.memory = options.memory || null;
    this.cacheTtlMs = options.cacheTtlMs || 60_000;
    this.cache = new Map();
  }

  getCacheKey(repo) {
    return String(repo || '').toLowerCase();
  }

  getCachedVerification(repo) {
    const key = this.getCacheKey(repo);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const expired = (Date.now() - entry.cachedAt) > this.cacheTtlMs;
    if (expired) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  setCachedVerification(repo, value) {
    const key = this.getCacheKey(repo);
    this.cache.set(key, {
      cachedAt: Date.now(),
      value,
    });
  }

  async getMemoryVerification(repo) {
    if (!this.memory || typeof this.memory.get !== 'function') {
      return null;
    }

    try {
      const memoryKey = `repo-verification:${repo}`;
      const stored = await this.memory.get(memoryKey);
      if (!stored) {
        return null;
      }

      return {
        source: 'memory',
        repository: repo,
        ...stored,
      };
    } catch {
      return null;
    }
  }

  async verifyWithGitHub(repo) {
    const existence = await this.github.repoExists(repo);

    if (!existence.exists) {
      return {
        isValid: false,
        repository: repo,
        issues: [`Repository ${repo} could not be verified on GitHub: ${existence.error}`],
        evidence: [{ type: 'github', status: 'not_found', repository: repo }],
      };
    }

    const validation = {
      isValid: true,
      repository: repo,
      issues: [],
      evidence: [{
        type: 'github',
        full_name: existence.data.full_name,
        default_branch: existence.data.default_branch,
        visibility: existence.data.private ? 'private' : 'public',
      }],
    };

    if (this.memory && typeof this.memory.set === 'function') {
      try {
        const memoryKey = `repo-verification:${repo}`;
        await this.memory.set(memoryKey, {
          isValid: validation.isValid,
          issues: validation.issues,
          evidence: validation.evidence,
          cachedAt: Date.now(),
        });
      } catch {
        // best effort cache write
      }
    }

    return validation;
  }

  async validateRepositoryClaims(text, options = {}) {
    const responseText = String(text || '');
    const explicitRepo = options.repo || options.repository;
    const repo = explicitRepo || this.github.extractRepoFromText(responseText);

    if (!repo) {
      return {
        isValid: true,
        repository: null,
        issues: [],
        evidence: [],
      };
    }

    const cached = this.getCachedVerification(repo);
    if (cached) {
      return {
        ...cached,
        evidence: [...(cached.evidence || []), { type: 'cache', provider: 'memory-map' }],
      };
    }

    const memoryValidation = await this.getMemoryVerification(repo);
    if (memoryValidation) {
      const normalized = {
        isValid: Boolean(memoryValidation.isValid),
        repository: repo,
        issues: Array.isArray(memoryValidation.issues) ? memoryValidation.issues : [],
        evidence: Array.isArray(memoryValidation.evidence)
          ? [...memoryValidation.evidence, { type: 'cache', provider: 'letta-memory' }]
          : [{ type: 'cache', provider: 'letta-memory' }],
      };
      this.setCachedVerification(repo, normalized);
      return normalized;
    }

    const githubValidation = await this.verifyWithGitHub(repo);
    this.setCachedVerification(repo, githubValidation);
    return githubValidation;
  }

  formatCorrection(originalText, validation) {
    if (validation.isValid) {
      return String(originalText || '');
    }

    return `${String(originalText || '')}\n\n⚠️ Verification note: ${validation.issues.join(' ')}`.trim();
  }

  async enforce(text, options = {}) {
    const validation = await this.validateRepositoryClaims(text, options);
    return {
      text: this.formatCorrection(text, validation),
      validation,
    };
  }

  async processResponse(text, options = {}) {
    return this.enforce(text, options);
  }

  async validateResponse(text, options = {}) {
    return this.enforce(text, options);
  }

  async apply(text, options = {}) {
    return this.enforce(text, options);
  }
}

module.exports = AntiHallucinationMiddleware;
