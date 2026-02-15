const DEFAULT_SUMMARY = 'Task executed.';

const normalizeExecutionPackage = (payload = {}, fallback = {}) => {
  const summary = payload.summary || payload.response || payload.message || fallback.summary || DEFAULT_SUMMARY;

  return {
    status: payload.status || 'completed',
    summary,
    sections: payload.sections || {},
    activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
    artifacts: Array.isArray(payload.artifacts) ? payload.artifacts : [],
    nextActions: Array.isArray(payload.nextActions) ? payload.nextActions : [],
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    meta: payload.meta || {},
    raw: payload
  };
};

module.exports = {
  normalizeExecutionPackage
};
