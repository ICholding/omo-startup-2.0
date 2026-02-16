class FallbackManager {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownMs = options.cooldownMs || 60_000;
    this.state = new Map();
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
      return false;
    }

    return true;
  }

  markSuccess(serviceName) {
    const entry = this.getServiceState(serviceName);
    entry.failures = 0;
    entry.openedAt = null;
  }

  markFailure(serviceName) {
    const entry = this.getServiceState(serviceName);
    entry.failures += 1;

    if (entry.failures >= this.failureThreshold) {
      entry.openedAt = Date.now();
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
        this.markFailure(serviceName);
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
