const fetch = require('node-fetch');
const { normalizeExecutionPackage } = require('../agent-contract');

class MoltbotAdapter {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.MOLTBOT_URL || 'http://localhost:8080').replace(/\/$/, '');
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 10000);
    this.chatPaths = this.buildPathCandidates(
      options.chatPath || process.env.MOLTBOT_CHAT_PATH,
      [
        '/api/chat/message',
        '/chat/message',
        '/api/chat',
        '/chat',
        '/api/v1/chat/message',
        '/v1/chat/message',
        '/api/v1/chat',
        '/v1/chat',
        '/api/message',
        '/message'
      ]
    );
    this.healthPaths = this.buildPathCandidates(
      options.healthPath || process.env.MOLTBOT_HEALTH_PATH,
      ['/health', '/api/health']
    );
  }

  buildPathCandidates(primaryPath, fallbackPaths = []) {
    const normalizePath = (value) => {
      if (!value || typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    };

    const uniquePaths = new Set();
    [primaryPath, ...fallbackPaths].forEach((path) => {
      const normalized = normalizePath(path);
      if (normalized) {
        uniquePaths.add(normalized);
      }
    });

    return [...uniquePaths];
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        for (const healthPath of this.healthPaths) {
          const response = await this.fetchWithTimeout(`${this.baseUrl}${healthPath}`);
          if (response.ok) {
            return true;
          }

          if (response.status !== 404) {
            console.warn(`[MoltbotAdapter] Health check returned status ${response.status} on ${healthPath} (attempt ${attempt}/${maxAttempts}).`);
          }
        }
      } catch (error) {
        console.warn(`[MoltbotAdapter] Health check failed (attempt ${attempt}/${maxAttempts}): ${error.message}`);
      }
    }

    return false;
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    if (onEvent) {
      return this.executeStream({ message, sessionId, context, onEvent });
    }

    const payload = await this.executeBlocking({ message, sessionId, context });
    return normalizeExecutionPackage(payload);
  }

  async executeBlocking({ message, sessionId, context = [] }) {
    let lastStatusCode = null;
    let lastErrorBody = '';
    let lastTriedPath = null;

    for (const chatPath of this.chatPaths) {
      lastTriedPath = chatPath;
      const response = await this.fetchWithTimeout(`${this.baseUrl}${chatPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, context })
      });

      if (response.ok) {
        return response.json();
      }

      lastStatusCode = response.status;
      lastErrorBody = await response.text();

      if (response.status !== 404) {
        throw new Error(`Moltbot request failed with status ${response.status} on path ${chatPath}${lastErrorBody ? `: ${lastErrorBody}` : ''}`);
      }
    }

    throw new Error(`Moltbot request failed with status ${lastStatusCode || 404} after trying paths: ${this.chatPaths.join(', ')}${lastTriedPath ? ` (last tried ${lastTriedPath})` : ''}${lastErrorBody ? `: ${lastErrorBody}` : ''}`);
  }

  async executeStream({ message, sessionId, context = [], onEvent }) {
    // Moltbot doesn't support streaming - use the blocking endpoint and simulate stream events.
    const data = await this.executeBlocking({ message, sessionId, context });
    
    // Emit response event to simulate streaming behavior
    onEvent?.('response', { message: data.response || data.message || data });
    onEvent?.('execution-complete', data);

    return normalizeExecutionPackage(data);
  }
}

module.exports = MoltbotAdapter;
