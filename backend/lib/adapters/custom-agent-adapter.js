const { normalizeExecutionPackage } = require('../agent-contract');

class CustomAgentAdapter {
  async health() {
    return true;
  }

  async execute({ message, sessionId, onEvent }) {
    onEvent?.('execution-start', {
      state: 'thinking',
      message: 'Thinking...'
    });

    const executionPackage = normalizeExecutionPackage({
      summary: `Custom agent fallback response for session ${sessionId}: ${message}`,
      sections: {
        Notes: 'Set AGENT_PROVIDER=moltbot and MOLTBOT_URL to use the external Moltbot service.'
      }
    });

    onEvent?.('execution-complete', executionPackage);
    return executionPackage;
  }
}

module.exports = CustomAgentAdapter;
