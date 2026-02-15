const fetch = require('node-fetch');
const { normalizeExecutionPackage } = require('../agent-contract');

/**
 * Moltbot Adapter - Now with OpenRouter Integration
 * Falls back to local Moltbot container if OpenRouter is not configured
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.MOLTBOT_URL || 'http://localhost:8080').replace(/\/$/, '');
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 10000);
    this.chatPaths = this.buildPathCandidates(
      options.chatPath || process.env.MOLTBOT_CHAT_PATH,
      ['/api/chat/message', '/chat/message', '/api/message', '/message']
    );
    this.healthPaths = this.buildPathCandidates(
      options.healthPath || process.env.MOLTBOT_HEALTH_PATH,
      ['/health', '/api/health']
    );
    
    // OpenRouter configuration
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
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
    // If OpenRouter is configured, consider it healthy
    if (this.openrouterKey) {
      return true;
    }

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
    // Prefer OpenRouter if configured for conversational AI
    if (this.openrouterKey) {
      return this.executeWithOpenRouter({ message, sessionId, context, onEvent });
    }
    
    // Fall back to local Moltbot container
    if (onEvent) {
      return this.executeStream({ message, sessionId, context, onEvent });
    }

    const payload = await this.executeBlocking({ message, sessionId, context });
    return normalizeExecutionPackage(payload);
  }

  async executeWithOpenRouter({ message, sessionId, context = [], onEvent }) {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Provide conversational, natural responses.'
      },
      ...context,
      { role: 'user', content: message }
    ];

    try {
      // Emit thinking event
      onEvent?.('execution-start', { state: 'thinking', message: 'Thinking...' });

      const response = await this.fetchWithTimeout(this.openrouterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': 'OMO Startup Assistant'
        },
        body: JSON.stringify({
          model: this.openrouterModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const aiResponse = data.choices[0].message.content;

      // Emit response events
      onEvent?.('response', { message: aiResponse });
      
      const executionPackage = {
        status: 'completed',
        summary: aiResponse,
        sections: {
          Response: aiResponse
        },
        nextActions: ['Continue conversation']
      };
      
      onEvent?.('execution-complete', executionPackage);

      return normalizeExecutionPackage(executionPackage);
    } catch (error) {
      console.error('[MoltbotAdapter] OpenRouter error:', error.message);
      throw error;
    }
  }

  async executeBlocking({ message, sessionId, context = [] }) {
    let lastStatusCode = null;
    for (const chatPath of this.chatPaths) {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${chatPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, context })
      });

      if (response.ok) {
        return response.json();
      }

      lastStatusCode = response.status;

      if (response.status !== 404) {
        throw new Error(`Moltbot request failed with status ${response.status}`);
      }
    }

    throw new Error(`Moltbot request failed with status ${lastStatusCode || 404}`);
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
