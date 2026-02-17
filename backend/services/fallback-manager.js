const EventEmitter = require('events');

class FallbackManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownMs = options.cooldownMs || 60_000;
    this.healthCheckIntervalMs = options.healthCheckIntervalMs || 30_000;
    this.state = new Map();
    this.health = new Map();

    this.healthTimer = setInterval(() => {
      this.emit('health:tick', this.getHealthSnapshot());
    }, this.healthCheckIntervalMs);

    if (typeof this.healthTimer.unref === 'function') {
      this.healthTimer.unref();
    }
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

  getHealthSnapshot() {
    const snapshot = {};
    for (const [serviceName, serviceState] of this.state.entries()) {
      snapshot[serviceName] = {
        failures: serviceState.failures,
        circuitOpen: Boolean(serviceState.openedAt),
        openedAt: serviceState.openedAt,
      };
    }
    return snapshot;
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
      this.emit('circuit:closed', { serviceName, reason: 'cooldown_elapsed' });
      return false;
    }

    return true;
  }

  markSuccess(serviceName) {
    const entry = this.getServiceState(serviceName);
    entry.failures = 0;
    entry.openedAt = null;
    this.emit('service:success', { serviceName });
  }

  markFailure(serviceName, error) {
    const entry = this.getServiceState(serviceName);
    entry.failures += 1;

    this.emit('service:failure', {
      serviceName,
      failures: entry.failures,
      error: error?.message || String(error || 'unknown_error'),
    });

    if (entry.failures >= this.failureThreshold) {
      entry.openedAt = Date.now();
      this.emit('circuit:opened', { serviceName, failures: entry.failures });
    }
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
        this.markSuccess(serviceName);
        return {
          ok: true,
          serviceName,
          provider,
          result,
        };
      } catch (error) {
        this.markFailure(serviceName, error);
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

  async executeWithHandlers(serviceName, handlers = {}) {
    const normalizedHandlers = Object.entries(handlers).map(([name, fn]) => {
      const wrapped = async () => fn();
      Object.defineProperty(wrapped, 'name', { value: name, configurable: true });
      return wrapped;
    });

    return this.executeWithFallback(serviceName, normalizedHandlers);
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
