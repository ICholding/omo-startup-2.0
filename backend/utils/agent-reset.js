/**
 * Agent Reset Utility
 * Resets agent logic to default automation agent state
 * Clears all cached session data and residual states
 */

const AGENT_MODE_KEY = 'hackerai-agent-mode';
const AGENT_CONTEXT_KEY = 'hackerai-agent-context';
const DEFAULT_AGENT_CONFIG = {
  mode: 'automation',
  context: [],
  reasoningEnabled: false,
  thinkingIndicator: false,
  sessionHistory: []
};

/**
 * Reset agent to default automation state
 * @param {string} sessionId - Current session ID to preserve
 * @returns {Object} Default agent configuration
 */
function resetAgentToDefault(sessionId = null) {
  const config = {
    ...DEFAULT_AGENT_CONFIG,
    sessionId,
    resetTimestamp: new Date().toISOString()
  };

  // Clear any stored agent context
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AGENT_CONTEXT_KEY);
    localStorage.setItem(AGENT_MODE_KEY, 'automation');
  }

  console.log('[Agent] Reset to default automation state:', config);
  return config;
}

/**
 * Clear all session-related storage
 * Preserves only the current active session
 * @param {string} currentSessionId - Session to preserve
 */
function clearLegacySessions(currentSessionId) {
  const keysToClear = [
    'hackerai-chat-messages',
    'hackerai-agent-context',
    'hackerai-reasoning-history'
  ];

  if (typeof localStorage !== 'undefined') {
    keysToClear.forEach(key => localStorage.removeItem(key));
    
    // Clear session-specific data except current
    const sessionMapKey = 'hackerai-chat-messages-by-session';
    const stored = localStorage.getItem(sessionMapKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const cleared = { [currentSessionId]: parsed[currentSessionId] || [] };
        localStorage.setItem(sessionMapKey, JSON.stringify(cleared));
      } catch (e) {
        localStorage.removeItem(sessionMapKey);
      }
    }
  }

  console.log('[Agent] Cleared legacy sessions, preserved:', currentSessionId);
}

/**
 * Initialize fresh agent for new session
 * @param {string} sessionId - New session ID
 * @returns {Object} Fresh agent state
 */
function initializeFreshAgent(sessionId) {
  clearLegacySessions(sessionId);
  return resetAgentToDefault(sessionId);
}

module.exports = {
  resetAgentToDefault,
  clearLegacySessions,
  initializeFreshAgent,
  DEFAULT_AGENT_CONFIG
};
