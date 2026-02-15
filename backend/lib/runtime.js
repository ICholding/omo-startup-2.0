const { createAdapter } = require('./adapters');

class AgentRuntime {
  constructor(options = {}) {
    this.provider = options.provider || process.env.AGENT_PROVIDER || 'moltbot';
    this.adapter = options.adapter || createAdapter(this.provider);
  }

  async getStatus() {
    return {
      provider: this.provider,
      healthy: await this.adapter.health()
    };
  }

  async execute(input) {
    return this.adapter.execute(input);
  }
}

module.exports = AgentRuntime;
