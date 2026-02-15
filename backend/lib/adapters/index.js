const MoltbotAdapter = require('./moltbot-adapter');
const CustomAgentAdapter = require('./custom-agent-adapter');

const createAdapter = (provider = process.env.AGENT_PROVIDER || 'moltbot') => {
  if (provider === 'moltbot') {
    return new MoltbotAdapter();
  }

  return new CustomAgentAdapter();
};

module.exports = {
  createAdapter
};
