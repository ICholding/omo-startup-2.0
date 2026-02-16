class ServiceConnector {
  constructor(name) {
    this.name = name;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return { name: this.name, connected: true };
  }

  status() {
    return { name: this.name, connected: this.connected };
  }
}

class SystemIntegrations {
  constructor({ github, telegram, slack } = {}) {
    this.github = github || new ServiceConnector('github');
    this.telegram = telegram || new ServiceConnector('telegram');
    this.slack = slack || new ServiceConnector('slack');
  }

  async establishConnections() {
    return Promise.all([
      this.github.connect(),
      this.telegram.connect(),
      this.slack.connect()
    ]);
  }

  getStatus() {
    return {
      github: this.github.status(),
      telegram: this.telegram.status(),
      slack: this.slack.status()
    };
  }
}

module.exports = {
  SystemIntegrations,
  ServiceConnector
};
