const githubService = require('./services/github');

class AntiHallucinationMiddleware {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
  }

  async validateTask(task = {}) {
    if (!this.enabled) {
      return { allowed: true, reason: 'middleware disabled' };
    }

    const taskType = task.task_type || task.taskType;
    if (!taskType) {
      return { allowed: false, reason: 'missing task type' };
    }

    return { allowed: true, reason: 'task accepted' };
  }

  async validateGitHubAction(action, options = {}) {
    if (!action) {
      return { allowed: false, reason: 'missing github action' };
    }

    try {
      const result = await githubService.run(action, options);
      return { allowed: true, result };
    } catch (error) {
      return { allowed: false, reason: error.message };
    }
  }

  // Express-compatible middleware hook used by older private-clawbot builds.
  handler() {
    return async (_req, _res, next) => {
      next();
    };
  }
}

module.exports = new AntiHallucinationMiddleware();
module.exports.AntiHallucinationMiddleware = AntiHallucinationMiddleware;
module.exports.createAntiHallucinationMiddleware = (options) => new AntiHallucinationMiddleware(options);
