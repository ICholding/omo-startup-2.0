const { normalizeExecutionPackage } = require('../agent-contract');

class MoltbotAdapter {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.MOLTBOT_URL || 'http://localhost:8080').replace(/\/$/, '');
  }

  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    onEvent?.('execution-start', {
      state: 'thinking',
      message: 'Thinking...'
    });

    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, context })
    });

    if (!response.ok) {
      throw new Error(`Moltbot request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const executionPackage = normalizeExecutionPackage(payload);

    onEvent?.('execution-complete', executionPackage);
    return executionPackage;
  }
}

module.exports = MoltbotAdapter;
