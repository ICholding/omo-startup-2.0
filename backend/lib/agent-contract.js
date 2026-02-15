const DEFAULT_SUMMARY = 'Task executed.';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeExecutionPackage = (payload = {}, fallback = {}) => {
  const safePayload = isPlainObject(payload) ? payload : {};
  const safeFallback = isPlainObject(fallback) ? fallback : {};

  const summary = safePayload.summary
    || safePayload.response
    || safePayload.message
    || safeFallback.summary
    || DEFAULT_SUMMARY;

  return {
    status: typeof safePayload.status === 'string' ? safePayload.status : 'completed',
    summary,
    sections: isPlainObject(safePayload.sections) ? safePayload.sections : {},
    activityLog: Array.isArray(safePayload.activityLog) ? safePayload.activityLog : [],
    artifacts: Array.isArray(safePayload.artifacts) ? safePayload.artifacts : [],
    nextActions: Array.isArray(safePayload.nextActions) ? safePayload.nextActions : [],
    errors: Array.isArray(safePayload.errors)
      ? safePayload.errors
      : (!isPlainObject(payload) ? ['Agent returned an invalid payload shape.'] : []),
    meta: isPlainObject(safePayload.meta) ? safePayload.meta : {},
    raw: payload
  };
};

module.exports = {
  normalizeExecutionPackage
};
