const { normalizeExecutionPackage } = require('../agent-contract');

class MoltbotAdapter {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.MOLTBOT_URL || 'http://localhost:8080').replace(/\/$/, '');
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 10000);
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
        const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);
        if (response.ok) {
          return true;
        }
        console.warn(`[MoltbotAdapter] Health check returned status ${response.status} (attempt ${attempt}/${maxAttempts}).`);
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
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, context })
    });

    if (!response.ok) {
      throw new Error(`Moltbot request failed with status ${response.status}`);
    }

    return response.json();
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
