class InMemoryStore {
  constructor(label) {
    this.label = label;
    this.records = new Map();
  }

  async connect() {
    return { connected: true, label: this.label };
  }

  async upsert(key, value) {
    this.records.set(key, value);
    return value;
  }

  async get(key) {
    return this.records.get(key) || null;
  }

  async values() {
    return Array.from(this.records.values());
  }
}

class MemoryManager {
  constructor({ shortTerm, longTerm, vectorStore } = {}) {
    this.shortTerm = shortTerm || new InMemoryStore('short-term');
    this.longTerm = longTerm || new InMemoryStore('long-term');
    this.vectorStore = vectorStore || new InMemoryStore('vector-store');
  }

  async start() {
    await Promise.all([
      this.shortTerm.connect(),
      this.longTerm.connect(),
      this.vectorStore.connect()
    ]);
  }

  async storeConversation({ sessionId, message, response, metadata = {} }) {
    const timestamp = new Date().toISOString();
    const record = {
      id: `${sessionId}:${timestamp}`,
      sessionId,
      type: 'conversation',
      content: { message, response },
      metadata,
      timestamp
    };

    await this.shortTerm.upsert(record.id, record);
    await this.longTerm.upsert(record.id, record);
    await this.vectorStore.upsert(record.id, {
      id: record.id,
      sessionId,
      summary: `${message} ${response}`,
      timestamp
    });

    return record;
  }

  async retrieve(memoryId) {
    return this.longTerm.get(memoryId);
  }

  async recent(limit = 20) {
    const values = await this.shortTerm.values();
    return values.slice(-limit);
  }
}

module.exports = {
  MemoryManager,
  InMemoryStore
};
