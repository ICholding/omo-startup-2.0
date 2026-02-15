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
    const streamUrl = new URL(`${this.baseUrl}/api/chat/stream`);
    streamUrl.searchParams.set('message', message);
    streamUrl.searchParams.set('sessionId', sessionId);
    streamUrl.searchParams.set('context', JSON.stringify(context));

    const response = await this.fetchWithTimeout(streamUrl, {
      headers: { Accept: 'text/event-stream' }
    });

    if (!response.ok || !response.body) {
      throw new Error(`Moltbot streaming request failed with status ${response.status}`);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finalPackage = null;

    const emitEventBlock = (rawBlock) => {
      const lines = rawBlock.split('\n').map((line) => line.trim());
      const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
      const dataLine = lines.find((line) => line.startsWith('data:'));
      let parsedData = {};

      if (dataLine) {
        try {
          parsedData = JSON.parse(dataLine.slice(5).trim());
        } catch {
          parsedData = { message: dataLine.slice(5).trim() };
        }
      }

      onEvent?.(event, parsedData);

      if (event === 'execution-complete') {
        finalPackage = normalizeExecutionPackage(parsedData);
      }
      if (event === 'execution-error') {
        throw new Error(parsedData.error || 'Moltbot streaming execution failed');
      }
    };

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (block.trim()) {
          emitEventBlock(block);
        }
      }
    }

    if (!finalPackage) {
      throw new Error('Moltbot stream ended without execution-complete event');
    }

    return finalPackage;
  }
}

module.exports = MoltbotAdapter;
