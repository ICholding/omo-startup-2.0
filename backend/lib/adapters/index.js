const MoltbotAdapter = require('./moltbot-adapter');
const CustomAgentAdapter = require('./custom-agent-adapter');

const createAdapter = (provider = process.env.AGENT_PROVIDER || 'moltbot') => {
  const normalizedProvider = String(provider || '').toLowerCase();

  // openclaw is a backward-compatible alias for moltbot runtime integration.
  if (normalizedProvider === 'moltbot' || normalizedProvider === 'openclaw') {
    return new MoltbotAdapter();
  }

  return new CustomAgentAdapter();
};

module.exports = {
  createAdapter
};
