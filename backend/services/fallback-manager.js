const EventEmitter = require('events');

class FallbackManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownMs = options.cooldownMs || 60_000;
    this.healthCheckIntervalMs = options.healthCheckIntervalMs || 30_000;
    this.state = new Map();
    this.healthStatuses = new Map();
    this.healthTimer = null;
  }

  getServiceState(serviceName) {
    if (!this.state.has(serviceName)) {
      this.state.set(serviceName, {
        failures: 0,
        openedAt: null,
      });
    }

    return this.state.get(serviceName);
  }

  isCircuitOpen(serviceName) {
    const entry = this.getServiceState(serviceName);
    if (!entry.openedAt) {
      return false;
    }

    const elapsed = Date.now() - entry.openedAt;
    if (elapsed >= this.cooldownMs) {
      entry.openedAt = null;
      entry.failures = 0;
      this.emit('circuit:half-open', { serviceName });
      return false;
    }

    return true;
  }

  markSuccess(serviceName, provider) {
    const entry = this.getServiceState(serviceName);
    entry.failures = 0;
    entry.openedAt = null;
    this.emit('service:success', { serviceName, provider });
  }

  markFailure(serviceName, provider, error) {
    const entry = this.getServiceState(serviceName);
    entry.failures += 1;
    this.emit('service:failure', {
      serviceName,
      provider,
      failures: entry.failures,
      error: error?.message || String(error || 'Unknown error'),
    });

    if (entry.failures >= this.failureThreshold) {
      entry.openedAt = Date.now();
      this.emit('circuit:open', { serviceName, provider, failures: entry.failures });
    }
  }

  startHealthMonitor(healthCheckFn) {
    if (this.healthTimer) {
      return;
    }

    this.healthTimer = setInterval(async () => {
      if (typeof healthCheckFn !== 'function') {
        return;
      }

      try {
        const snapshot = await healthCheckFn();
        if (snapshot && typeof snapshot === 'object') {
          Object.entries(snapshot).forEach(([serviceName, isHealthy]) => {
            this.healthStatuses.set(serviceName, Boolean(isHealthy));
          });
        }
        this.emit('health:update', Object.fromEntries(this.healthStatuses.entries()));
      } catch (error) {
        this.emit('health:error', { error: error.message });
      }
    }, this.healthCheckIntervalMs);

    if (typeof this.healthTimer.unref === 'function') {
      this.healthTimer.unref();
    }
  }

  stopHealthMonitor() {
    if (!this.healthTimer) {
      return;
    }

    clearInterval(this.healthTimer);
    this.healthTimer = null;
  }

  async executeWithFallback(serviceName, handlers = []) {
    if (this.isCircuitOpen(serviceName)) {
      return {
        ok: false,
        serviceName,
        provider: null,
        error: `circuit_open:${serviceName}`,
      };
    }

    for (const handler of handlers) {
      const provider = handler.name || 'anonymous-provider';
      try {
        const result = await handler();
        this.markSuccess(serviceName, provider);
        return {
          ok: true,
          serviceName,
          provider,
          result,
        };
      } catch (error) {
        this.markFailure(serviceName, provider, error);
        if (this.isCircuitOpen(serviceName)) {
          return {
            ok: false,
            serviceName,
            provider,
            error: `circuit_open:${serviceName}`,
            reason: error.message,
          };
        }
      }
    }

    return {
      ok: false,
      serviceName,
      provider: null,
      error: `all_providers_failed:${serviceName}`,
    };
  }

  async executeWithHandlers(serviceName, handlers = []) {
    return this.executeWithFallback(serviceName, handlers);
  }

  getDefaultChains() {
    return {
      ai_model: ['grok', 'claude-haiku', 'gpt-4o-mini', 'local-llm'],
      memory: ['letta-postgres', 'letta-sqlite', 'json-file', 'in-memory'],
      vector_store: ['chromadb', 'qdrant', 'in-memory'],
      database: ['postgresql', 'sqlite'],
    };
  }
}

module.exports = new FallbackManager();
module.exports.FallbackManager = FallbackManager;
