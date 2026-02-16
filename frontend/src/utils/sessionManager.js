/**
 * Session Manager Utility
 * Centralized session state management for consistent app state
 */

const SESSION_STORAGE_KEY = 'omo-sessions-v2';
const ACTIVE_SESSION_KEY = 'omo-active-session-id';

/**
 * Generate a unique session ID
 */
export const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get default session name based on count
 */
export const getDefaultSessionName = (sessions = []) => {
  return `Session ${sessions.length + 1}`;
};

/**
 * Create a new session object
 */
export const createSession = (name = null, id = null) => {
  const sessionId = id || generateSessionId();
  const sessions = getAllSessions();
  const sessionName = name || getDefaultSessionName(sessions);
  
  return {
    id: sessionId,
    name: sessionName,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    pinned: false,
  };
};

/**
 * Get all sessions from storage
 */
export const getAllSessions = () => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading sessions:', e);
    return [];
  }
};

/**
 * Save all sessions to storage
 */
export const saveAllSessions = (sessions) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving sessions:', e);
  }
};

/**
 * Get active session ID
 */
export const getActiveSessionId = () => {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
};

/**
 * Set active session ID
 */
export const setActiveSessionId = (sessionId) => {
  if (sessionId) {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
};

/**
 * Get a specific session by ID
 */
export const getSessionById = (sessionId) => {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === sessionId) || null;
};

/**
 * Add a new session
 */
export const addSession = (name = null, id = null) => {
  const sessions = getAllSessions();
  const newSession = createSession(name, id);
  
  // Add to beginning of list
  sessions.unshift(newSession);
  
  // Limit to 50 sessions
  if (sessions.length > 50) {
    sessions.pop();
  }
  
  saveAllSessions(sessions);
  setActiveSessionId(newSession.id);
  
  return newSession;
};

/**
 * Update session name
 */
export const renameSession = (sessionId, newName) => {
  const sessions = getAllSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) return null;
  
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };
  
  saveAllSessions(sessions);
  return sessions[sessionIndex];
};

/**
 * Update session message count
 */
export const updateSessionMessageCount = (sessionId, count) => {
  const sessions = getAllSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) return null;
  
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    messageCount: count,
    updatedAt: new Date().toISOString(),
  };
  
  saveAllSessions(sessions);
  return sessions[sessionIndex];
};

/**
 * Delete a session
 */
export const deleteSession = (sessionId) => {
  const sessions = getAllSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveAllSessions(filtered);
  
  // Clear active session if it was deleted
  if (getActiveSessionId() === sessionId) {
    setActiveSessionId(null);
  }
  
  return filtered;
};

/**
 * Archive a session
 */
export const archiveSession = (sessionId) => {
  const sessions = getAllSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) return null;
  
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };
  
  saveAllSessions(sessions);
  return sessions[sessionIndex];
};

/**
 * Toggle pin status
 */
export const togglePinSession = (sessionId) => {
  const sessions = getAllSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) return null;
  
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    pinned: !sessions[sessionIndex].pinned,
    updatedAt: new Date().toISOString(),
  };
  
  saveAllSessions(sessions);
  return sessions[sessionIndex];
};

/**
 * Ensure an active session exists (auto-create if needed)
 */
export const ensureActiveSession = () => {
  const activeId = getActiveSessionId();
  const sessions = getAllSessions();
  
  // Check if active session exists and is valid
  if (activeId) {
    const activeSession = sessions.find(s => s.id === activeId && s.status === 'active');
    if (activeSession) {
      return activeSession;
    }
  }
  
  // Check if there are any active sessions
  const activeSessions = sessions.filter(s => s.status === 'active');
  if (activeSessions.length > 0) {
    // Use the most recently updated active session
    const mostRecent = activeSessions.sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];
    setActiveSessionId(mostRecent.id);
    return mostRecent;
  }
  
  // Create new session
  return addSession();
};

/**
 * Initialize session manager on app load
 */
export const initializeSessions = () => {
  // Migrate old session data if needed
  const oldSessionId = localStorage.getItem('omo-session-id');
  const oldSidebarState = localStorage.getItem('omo-sidebar-state');
  
  if (oldSidebarState && !localStorage.getItem(SESSION_STORAGE_KEY)) {
    try {
      const parsed = JSON.parse(oldSidebarState);
      if (parsed.sessions && Array.isArray(parsed.sessions)) {
        const migrated = parsed.sessions.map(s => ({
          ...s,
          status: s.status?.toLowerCase() === 'active' ? 'active' : 'archived',
          createdAt: s.timestamp || new Date().toISOString(),
          updatedAt: s.timestamp || new Date().toISOString(),
          pinned: parsed.pinnedSessionIds?.includes(s.id) || false,
        }));
        saveAllSessions(migrated);
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
  }
  
  // Ensure we have an active session
  return ensureActiveSession();
};

export default {
  generateSessionId,
  getDefaultSessionName,
  createSession,
  getAllSessions,
  saveAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  getSessionById,
  addSession,
  renameSession,
  updateSessionMessageCount,
  deleteSession,
  archiveSession,
  togglePinSession,
  ensureActiveSession,
  initializeSessions,
};
