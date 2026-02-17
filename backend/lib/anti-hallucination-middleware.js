const githubService = require('../services/github');
const lettaMemoryService = require('../services/letta-memory');

class AntiHallucinationMiddleware {
  constructor(options = {}) {
    this.github = options.github || githubService;
    this.memory = options.memory || lettaMemoryService;
    this.verificationCache = new Map();
    this.cacheTtlMs = options.cacheTtlMs || 5 * 60_000;
  }

  getCachedVerification(repo) {
    const entry = this.verificationCache.get(repo);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.verificationCache.delete(repo);
      return null;
    }

    return entry.value;
  }

  setCachedVerification(repo, value) {
    this.verificationCache.set(repo, {
      timestamp: Date.now(),
      value,
    });
  }

  async verifyWithMemory(repo) {
    if (!this.memory || typeof this.memory.getCoreMemory !== 'function') {
      return null;
    }

    try {
      const core = await this.memory.getCoreMemory();
      const verifiedRepos = Array.isArray(core?.verifiedRepos) ? core.verifiedRepos : [];
      const found = verifiedRepos.includes(repo);

      if (!found) {
        return null;
      }

      return {
        exists: true,
        source: 'letta-memory',
        data: {
          full_name: repo,
          default_branch: core?.defaultBranch || null,
        },
      };
    } catch {
      return null;
    }
  }

  async verifyWithGitHub(repo) {
    const existence = await this.github.repoExists(repo);
    return {
      exists: Boolean(existence.exists),
      source: 'github-api',
      data: existence.data || null,
      error: existence.error || null,
    };
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
      return cached;
    }

    const evidence = [];
    const issues = [];

    const memoryVerification = await this.verifyWithMemory(repo);
    if (memoryVerification?.exists) {
      evidence.push({
        type: 'repository',
        source: memoryVerification.source,
        full_name: memoryVerification.data.full_name,
        default_branch: memoryVerification.data.default_branch,
      });
    }

    const githubVerification = await this.verifyWithGitHub(repo);
    if (githubVerification.exists) {
      evidence.push({
        type: 'repository',
        source: githubVerification.source,
        full_name: githubVerification.data.full_name,
        default_branch: githubVerification.data.default_branch,
      });
    } else {
      issues.push(`Repository ${repo} could not be verified on GitHub: ${githubVerification.error}`);
    }

    const validation = {
      isValid: evidence.length > 0,
      repository: repo,
      issues,
      evidence,
    };

    this.setCachedVerification(repo, validation);
    return validation;
  }

  formatCorrection(originalText, validation) {
    if (validation.isValid) {
      return String(originalText || '');
    }

    const warning = validation.issues.length > 0
      ? validation.issues.join(' ')
      : 'Repository claim could not be independently verified.';

    return `${String(originalText || '')}\n\n⚠️ Verification note: ${warning}`.trim();
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
