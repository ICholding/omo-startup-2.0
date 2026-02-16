const https = require('https');

class GitHubService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://api.github.com';
    this.token = options.token || process.env.GITHUB_TOKEN || '';
    this.repo = options.repo || process.env.GITHUB_REPO || 'ICholding/omo-startup-2.0';
    this.userAgent = options.userAgent || 'OMO-Clawbot';
  }

  async request(method, endpoint, body) {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const url = new URL(endpoint, this.baseUrl);

    return new Promise((resolve, reject) => {
      const req = https.request(
        url,
        {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode || 500;
            let parsed = null;

            if (data) {
              try {
                parsed = JSON.parse(data);
              } catch {
                parsed = { raw: data };
              }
            }

            if (statusCode >= 400) {
              const message = parsed?.message || `GitHub request failed (${statusCode})`;
              reject(new Error(message));
              return;
            }

            resolve(parsed);
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(30000, () => req.destroy(new Error('GitHub request timed out')));

      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async getFile(path, ref = 'main') {
    return this.request('GET', `/repos/${this.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  }

  async listFiles(path = '', ref = 'main') {
    const normalizedPath = String(path || '').replace(/^\/+/, '');
    return this.request('GET', `/repos/${this.repo}/contents/${normalizedPath}?ref=${encodeURIComponent(ref)}`);
  }

  async getCommits({ branch = 'main', limit = 10 } = {}) {
    const clampedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    return this.request('GET', `/repos/${this.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${clampedLimit}`);
  }

  async triggerWorkflow(workflow, { ref = 'main', inputs = {} } = {}) {
    await this.request('POST', `/repos/${this.repo}/actions/workflows/${workflow}/dispatches`, {
      ref,
      inputs
    });

    return { ok: true, workflow, ref };
  }

  async run(action, options = {}) {
    switch (action) {
      case 'get_file':
        return this.getFile(options.path, options.ref);
      case 'list_files':
        return this.listFiles(options.path, options.ref);
      case 'get_commits':
        return this.getCommits({ branch: options.branch, limit: options.limit });
      case 'trigger_workflow':
        return this.triggerWorkflow(options.workflow, { ref: options.ref, inputs: options.inputs });
      default:
        throw new Error(`Unsupported GitHub action: ${action}`);
    }
  }
}

module.exports = new GitHubService();
module.exports.GitHubService = GitHubService;
