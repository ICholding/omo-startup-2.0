const { MemoryManager } = require('./memory-manager');
const { SecurityManager } = require('./security-manager');
const TaskManager = require('./task-manager');
const { SystemIntegrations } = require('./system-integrations');

class ClawbotCore {
  constructor({ memorySystem, securityLayer, taskManager, systemIntegrations } = {}) {
    this.memorySystem = memorySystem || new MemoryManager();
    this.securityLayer = securityLayer || new SecurityManager();
    this.taskManager = taskManager || new TaskManager();
    this.systemIntegrations = systemIntegrations || new SystemIntegrations();
    this.initialized = false;
  }

  async initialize() {
    await this.memorySystem.start();
    await this.securityLayer.setup();
    await this.systemIntegrations.establishConnections();
    this.taskManager.start();
    this.initialized = true;

    return this.status();
  }

  status() {
    return {
      initialized: this.initialized,
      integrations: this.systemIntegrations.getStatus(),
      queuedTasks: this.taskManager.list().length,
      auditEvents: this.securityLayer.audit.all().length
    };
  }
}

module.exports = ClawbotCore;
