const fs = require('fs');
const path = require('path');

const DEFAULT_CORE_MEMORY = {
  owner: 'ICholding',
  verifiedRepos: [],
  preferences: {},
  updatedAt: new Date().toISOString(),
};

class LettaMemoryService {
  constructor(options = {}) {
    this.options = {
      lettaUrl: process.env.LETTA_URL || 'http://localhost:8283',
      storageDir: options.storageDir || path.join(__dirname, '..', 'data', 'letta-memory'),
      jsonFile: options.jsonFile || 'facts.json',
      sqliteFile: options.sqliteFile || 'memory.sqlite',
      ...options,
    };

    this.coreMemory = { ...DEFAULT_CORE_MEMORY };
    this.facts = [];
    this.inMemoryFacts = [];
    this.provider = 'in-memory';
    this.ready = false;
  }

  async initialize() {
    fs.mkdirSync(this.options.storageDir, { recursive: true });

    // Preferred chain:
    // 1) Letta + PostgreSQL
    // 2) Letta + SQLite
    // 3) Local JSON file
    // 4) In-memory cache
    if (await this.tryLettaProvider('postgres')) {
      this.ready = true;
      return this.provider;
    }

    if (await this.tryLettaProvider('sqlite')) {
      this.ready = true;
      return this.provider;
    }

    if (await this.tryJsonProvider()) {
      this.ready = true;
      return this.provider;
    }

    this.provider = 'in-memory';
    this.ready = true;
    return this.provider;
  }

  async tryLettaProvider(mode) {
    try {
      // Lazy require so the service still works when package is unavailable.
      // eslint-disable-next-line global-require
      const { LettaClient } = require('letta-client');
      this.lettaClient = new LettaClient({ baseUrl: this.options.lettaUrl });

      await this.lettaClient.health?.();
      this.provider = mode === 'postgres' ? 'letta-postgres' : 'letta-sqlite';
      return true;
    } catch {
      return false;
    }
  }

  async tryJsonProvider() {
    try {
      this.jsonPath = path.join(this.options.storageDir, this.options.jsonFile);
      if (!fs.existsSync(this.jsonPath)) {
        const initial = {
          coreMemory: { ...DEFAULT_CORE_MEMORY },
          facts: [],
        };
        fs.writeFileSync(this.jsonPath, JSON.stringify(initial, null, 2));
      }

      const raw = fs.readFileSync(this.jsonPath, 'utf8');
      const data = JSON.parse(raw);

      this.coreMemory = data.coreMemory || { ...DEFAULT_CORE_MEMORY };
      this.facts = data.facts || [];
      this.provider = 'json';
      return true;
    } catch {
      return false;
    }
  }

  async persist() {
    if (this.provider !== 'json') {
      return;
    }

    const data = {
      coreMemory: {
        ...this.coreMemory,
        updatedAt: new Date().toISOString(),
      },
      facts: this.facts,
    };

    fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
  }

  async getCoreMemory() {
    return {
      ...this.coreMemory,
      provider: this.provider,
    };
  }

  async storeFact(claim, source = 'unknown', confidence = 0.5, metadata = {}) {
    const fact = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      claim,
      source,
      confidence,
      metadata,
      storedAt: new Date().toISOString(),
    };

    if (this.provider === 'json') {
      this.facts.push(fact);
      await this.persist();
    } else {
      this.inMemoryFacts.push(fact);
    }

    return fact;
  }

  async searchFacts(query, limit = 5) {
    const searchSpace = this.provider === 'json' ? this.facts : this.inMemoryFacts;

    const normalized = String(query || '').toLowerCase();
    return searchSpace
      .filter((fact) => fact.claim.toLowerCase().includes(normalized))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  async verifyClaim(claim) {
    const matches = await this.searchFacts(claim, 1);
    const match = matches[0];

    if (!match) {
      return {
        verified: false,
        confidence: 0,
        action: 'needs_verification',
      };
    }

    return {
      verified: match.confidence >= 0.7,
      confidence: match.confidence,
      action: match.confidence >= 0.7 ? 'accept' : 'needs_verification',
      source: match.source,
    };
  }

  async recordVerifiedRepos(repos = []) {
    this.coreMemory.verifiedRepos = Array.isArray(repos) ? repos : [];
    await this.persist();
    return this.coreMemory.verifiedRepos;
  }

  health() {
    return {
      ok: this.ready,
      provider: this.provider,
    };
  }
}

module.exports = new LettaMemoryService();
module.exports.LettaMemoryService = LettaMemoryService;
