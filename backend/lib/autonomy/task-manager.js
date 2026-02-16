class TaskManager {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.processNext().catch((error) => {
        console.error('[TaskManager] Failed to process task', error);
      });
    }, 500);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  create(task) {
    const item = {
      id: `task-${Date.now()}`,
      status: 'queued',
      createdAt: new Date().toISOString(),
      ...task
    };
    this.queue.push(item);
    return item;
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) {
      return null;
    }

    const next = this.queue.find((task) => task.status === 'queued');
    if (!next) {
      return null;
    }

    this.processing = true;
    next.status = 'running';
    next.startedAt = new Date().toISOString();

    await Promise.resolve(next.handler ? next.handler(next) : null);

    next.status = 'completed';
    next.completedAt = new Date().toISOString();
    this.processing = false;

    return next;
  }

  list() {
    return [...this.queue];
  }
}

module.exports = TaskManager;
