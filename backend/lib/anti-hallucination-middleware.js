const githubService = require('../services/github');

class AntiHallucinationMiddleware {
  constructor(options = {}) {
    this.github = options.github || githubService;
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
        evidence: []
      };
    }

    const existence = await this.github.repoExists(repo);
    if (!existence.exists) {
      return {
        isValid: false,
        repository: repo,
        issues: [`Repository ${repo} could not be verified on GitHub: ${existence.error}`],
        evidence: []
      };
    }

    return {
      isValid: true,
      repository: repo,
      issues: [],
      evidence: [{
        type: 'repository',
        full_name: existence.data.full_name,
        default_branch: existence.data.default_branch
      }]
    };
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
      validation
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
