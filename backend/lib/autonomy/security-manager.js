const crypto = require('crypto');

class AuditLogger {
  constructor() {
    this.events = [];
  }

  log(type, payload) {
    const event = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  all() {
    return [...this.events];
  }
}

class SecurityManager {
  constructor({ secret, auditLogger } = {}) {
    this.secret = secret || process.env.CLAWBOT_SECRET || 'dev-secret';
    this.audit = auditLogger || new AuditLogger();
    this.ready = false;
  }

  async setup() {
    this.ready = true;
    this.audit.log('security.setup', { ready: true });
  }

  validateToken(token) {
    if (!token) {
      return false;
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expectedHash = crypto.createHash('sha256').update(this.secret).digest('hex');
    const valid = hash === expectedHash;

    this.audit.log('security.token_validation', { valid });
    return valid;
  }

  async secureOperation(operationName, operation) {
    this.audit.log('security.operation_start', { operationName });

    const result = await operation();

    this.audit.log('security.operation_end', { operationName });
    return result;
  }
}

module.exports = {
  SecurityManager,
  AuditLogger
};
