const DEFAULT_API_BASE = 'https://api.github.com';

class GitHubService {
  constructor(options = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN || '';
    this.apiBase = options.apiBase || process.env.GITHUB_API_BASE || DEFAULT_API_BASE;
  }

  buildHeaders(extra = {}) {
    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'omo-startup-github-service',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra
    };
  }

  async request(pathname, init = {}) {
    const response = await fetch(`${this.apiBase}${pathname}`, {
      ...init,
      headers: this.buildHeaders(init.headers || {})
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.message || `GitHub request failed (${response.status})`,
        data
      };
    }

    return {
      ok: true,
      status: response.status,
      data
    };
  }

  normalizeRepo(repo) {
    const value = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    if (!value || !value.includes('/')) {
      return null;
    }

    const [owner, name] = value.split('/').filter(Boolean);
    if (!owner || !name) {
      return null;
    }

    return `${owner}/${name}`;
  }

  extractRepoFromText(text) {
    const value = String(text || '');

    const githubUrlMatch = value.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i);
    if (githubUrlMatch) {
      return this.normalizeRepo(githubUrlMatch[1]);
    }

    const ownerRepoMatch = value.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/);
    if (ownerRepoMatch) {
      return this.normalizeRepo(ownerRepoMatch[1]);
    }

    return null;
  }

  async repoExists(repo) {
    const normalized = this.normalizeRepo(repo);
    if (!normalized) {
      return { exists: false, error: 'Invalid repository identifier' };
    }

    const result = await this.request(`/repos/${normalized}`);
    return {
      exists: result.ok,
      repo: normalized,
      data: result.data,
      error: result.ok ? null : result.error
    };
  }

  async getFile(repo, filePath, ref = '') {
    const normalized = this.normalizeRepo(repo);
    if (!normalized) {
      return { ok: false, error: 'Invalid repository identifier' };
    }

    const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return this.request(`/repos/${normalized}/contents/${filePath}${suffix}`);
  }

  async listDirectory(repo, dirPath = '', ref = '') {
    return this.getFile(repo, dirPath, ref);
  }

  async getDefaultBranch(repo) {
    const existsResult = await this.repoExists(repo);
    if (!existsResult.exists) {
      return { ok: false, error: existsResult.error };
    }

    return {
      ok: true,
      defaultBranch: existsResult.data.default_branch || 'main'
    };
  }
}

module.exports = new GitHubService();
module.exports.GitHubService = GitHubService;
