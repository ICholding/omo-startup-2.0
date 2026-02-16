import React, { useEffect, useState } from 'react';
import {
  Settings,
  X,
  Plus,
  MoreHorizontal,
  Edit2,
  Split,
  Trash2,
  Archive,
  FolderPlus,
  Pin,
  LogOut,
  ArrowLeft,
  Brain,
  Terminal,
} from 'lucide-react';
import ProjectsView from './ProjectsView';
import {
  getAllSessions,
  initializeSessions,
  setActiveSessionId,
  renameSession,
  deleteSession,
  archiveSession,
  togglePinSession,
} from '../../../utils/sessionManager';

const SIDEBAR_STATE_KEY = 'omo-sidebar-state';
const MAX_ACTIVE_SESSIONS = 40;

const getNextSessionName = (sessions = []) => `Session ${sessions.length + 1}`;

const createSession = (name) => ({
  id: `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  name,
  status: 'Active',
  timestamp: new Date().toISOString(),
});

const createSessionFromId = (id, name) => ({
  id,
  name,
  status: 'Active',
  timestamp: new Date().toISOString(),
});

const normalizeSession = (session) => ({
  ...session,
  status: session?.status === 'archived' ? 'Archived' : 'Active',
  timestamp: session?.updatedAt || session?.createdAt || new Date().toISOString(),
});

const buildDefaultSidebarState = () => ({
  sessions: getAllSessions().map(normalizeSession).filter((s) => s?.status === 'Active'),
  archivedSessions: getAllSessions().map(normalizeSession).filter((s) => s?.status === 'Archived'),
  projects: [],
  selectedSessionId: initializeSessions()?.id || null,
  pinnedSessionIds: getAllSessions().filter((s) => s?.pinned).map((s) => s.id),
});

const OmoAiSidebar = ({ isOpen, onClose, onActiveSessionChange, onNewSession, currentSessionId, onSessionUpdate }) => {
  const [viewMode, setViewMode] = useState('sessions'); // 'sessions' | 'settings' | 'projects'
  const [settingsTab, setSettingsTab] = useState('archive'); // 'archive' | 'memory' | 'terminal'
  const [isProjectsView, setIsProjectsView] = useState(false);
  const [{ sessions, archivedSessions, projects, selectedSessionId, pinnedSessionIds }, setSidebarState] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (!stored) return buildDefaultSidebarState();
      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed?.projects)) return buildDefaultSidebarState();

      const managerSessions = getAllSessions().map(normalizeSession);
      const managerActiveSessions = managerSessions.filter((s) => s.status === 'Active');
      const managerArchivedSessions = managerSessions.filter((s) => s.status === 'Archived');
      const managerPinnedSessionIds = managerSessions.filter((s) => s?.pinned).map((s) => s.id);

      const selectedFromStorage = initializeSessions()?.id || parsed.selectedSessionId;
      const selectedExists = managerActiveSessions.some((s) => s?.id === selectedFromStorage);

      return {
        ...parsed,
        sessions: managerActiveSessions,
        archivedSessions: managerArchivedSessions,
        projects: parsed.projects.map((project) => ({
          ...project,
          sessionIds: Array.isArray(project?.sessionIds) ? project.sessionIds : [],
          archived: Boolean(project?.archived),
        })),
        selectedSessionId: selectedExists ? selectedFromStorage : managerActiveSessions[0]?.id || null,
        pinnedSessionIds: managerPinnedSessionIds,
      };
    } catch {
      return buildDefaultSidebarState();
    }
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [addingToProject, setAddingToProject] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('omo-session-id');
    localStorage.removeItem('omo-chat-messages');
    localStorage.removeItem('omo-chat-messages-by-session');
    localStorage.removeItem('omo-project-sessions');
    localStorage.removeItem(SIDEBAR_STATE_KEY);
    window.location.assign('/');
  };

  const emitSessionUpdate = (payload) => {
    if (typeof onSessionUpdate === 'function') {
      onSessionUpdate(payload);
    }
  };

  const setSelectedSession = (sessionId) => {
    if (!sessionId) return;
    setSidebarState((prev) => ({ ...prev, selectedSessionId: sessionId }));
    setActiveSessionId(sessionId);

    const session = sessions.find((s) => s?.id === sessionId);
    if (session && typeof onActiveSessionChange === 'function') {
      onActiveSessionChange({ id: session.id, name: session.name });
    }
  };

  useEffect(() => {
    if (typeof onActiveSessionChange === 'function') {
      const active = sessions.find((s) => s?.id === selectedSessionId);
      onActiveSessionChange(active ? { id: active.id, name: active.name } : null);
    }
  }, [selectedSessionId, sessions, onActiveSessionChange]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_STATE_KEY,
        JSON.stringify({ sessions, archivedSessions, projects, selectedSessionId, pinnedSessionIds })
      );
    } catch {
      // Ignore storage errors
    }
  }, [sessions, archivedSessions, projects, selectedSessionId, pinnedSessionIds]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest('[data-session-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Sort sessions: pinned first, then by timestamp
  const sortedSessions = [...sessions].sort((a, b) => {
    const aPinned = pinnedSessionIds.includes(a.id);
    const bPinned = pinnedSessionIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const activeSessions = sortedSessions.filter((s) => s?.status === 'Active');
  const activeSession = sessions.find((s) => s?.id === selectedSessionId);

  const handleAddSession = () => {
    const nextName = getNextSessionName(sessions);

    if (typeof onNewSession === 'function') {
      const created = onNewSession(nextName);
      if (created?.id) {
        const newSession = createSessionFromId(created.id, created.name || nextName);
        setSidebarState((prev) => ({
          ...prev,
          sessions: [newSession, ...prev.sessions].slice(0, MAX_ACTIVE_SESSIONS),
          selectedSessionId: newSession.id,
        }));
        emitSessionUpdate({ type: 'created', sessionId: newSession.id });
      }
      return;
    }

    const newSession = createSession(nextName);
    setSidebarState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions].slice(0, MAX_ACTIVE_SESSIONS),
      selectedSessionId: newSession.id,
    }));
    emitSessionUpdate({ type: 'created', sessionId: newSession.id });
  };

  const handleRename = (sessionId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setSidebarState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s?.id === sessionId ? { ...s, name: trimmed } : s)),
    }));
    renameSession(sessionId, trimmed);
    emitSessionUpdate({ type: 'renamed', sessionId, name: trimmed });
    setEditingId(null);
  };

  const handleDelete = (sessionId) => {
    const session = sessions.find((s) => s?.id === sessionId);
    if (!session) return;

    const isActive = session.status === 'Active';
    setSidebarState((prev) => {
      const nextSessions = prev.sessions.filter((s) => s?.id !== sessionId);
      const nextArchived = prev.archivedSessions.filter((s) => s?.id !== sessionId);
      const nextPinned = prev.pinnedSessionIds.filter((id) => id !== sessionId);
      return {
        ...prev,
        sessions: isActive ? nextSessions : prev.sessions,
        archivedSessions: isActive ? prev.archivedSessions : nextArchived,
        pinnedSessionIds: nextPinned,
        selectedSessionId: prev.selectedSessionId === sessionId ? null : prev.selectedSessionId,
      };
    });
    deleteSession(sessionId);
    emitSessionUpdate({ type: 'deleted', sessionId });
    setOpenMenuId(null);
  };

  const handleArchive = (sessionId) => {
    const session = sessions.find((s) => s?.id === sessionId);
    if (!session) return;

    const archived = { ...session, status: 'Archived', archivedDate: new Date().toLocaleDateString() };
    setSidebarState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s?.id !== sessionId),
      archivedSessions: [archived, ...prev.archivedSessions].slice(0, MAX_ACTIVE_SESSIONS),
      pinnedSessionIds: prev.pinnedSessionIds.filter((id) => id !== sessionId),
      selectedSessionId: prev.selectedSessionId === sessionId ? null : prev.selectedSessionId,
    }));
    archiveSession(sessionId);
    emitSessionUpdate({ type: 'archived', sessionId });
    setOpenMenuId(null);
  };

  const handleRestoreSession = (sessionId) => {
    const session = archivedSessions.find((s) => s?.id === sessionId);
    if (!session) return;

    const restored = { ...session, status: 'Active', timestamp: new Date().toISOString() };
    setSidebarState((prev) => ({
      ...prev,
      archivedSessions: prev.archivedSessions.filter((s) => s?.id !== sessionId),
      sessions: [restored, ...prev.sessions].slice(0, MAX_ACTIVE_SESSIONS),
      selectedSessionId: restored.id,
    }));
    emitSessionUpdate({ type: 'restored', sessionId: restored.id });
  };

  const handleDeleteSession = (sessionId) => {
    setSidebarState((prev) => ({
      ...prev,
      archivedSessions: prev.archivedSessions.filter((s) => s?.id !== sessionId),
    }));
    emitSessionUpdate({ type: 'deleted', sessionId });
  };

  const handleSplit = (sessionId) => {
    const session = sessions.find((s) => s?.id === sessionId);
    if (!session) return;

    const splitName = `${session.name} (split)`;
    const newSession = createSession(splitName);

    setSidebarState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions].slice(0, MAX_ACTIVE_SESSIONS),
      selectedSessionId: newSession.id,
    }));
    emitSessionUpdate({ type: 'created', sessionId: newSession.id, parentId: sessionId });
    setOpenMenuId(null);
  };

  const handlePinToggle = (sessionId) => {
    setSidebarState((prev) => {
      const isPinned = prev.pinnedSessionIds.includes(sessionId);
      const nextPinned = isPinned
        ? prev.pinnedSessionIds.filter((id) => id !== sessionId)
        : [...prev.pinnedSessionIds, sessionId];
      return { ...prev, pinnedSessionIds: nextPinned };
    });
    togglePinSession(sessionId);
    setOpenMenuId(null);
  };

  const handleAddToProject = (sessionId, projectId) => {
    setSidebarState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => {
        if (project?.id !== projectId) return project;
        const currentIds = Array.isArray(project?.sessionIds) ? project.sessionIds : [];
        if (currentIds.includes(sessionId)) return project;
        return { ...project, sessionIds: [...currentIds, sessionId] };
      }),
    }));
    emitSessionUpdate({ type: 'added_to_project', sessionId, projectId });
    setAddingToProject(null);
    setOpenMenuId(null);
  };

  const setProjects = (updater) => {
    setSidebarState((prev) => ({
      ...prev,
      projects: typeof updater === 'function' ? updater(prev.projects) : updater,
    }));
  };

  const startEditing = (sessionId, currentName) => {
    setEditingId(sessionId);
    setEditName(currentName || '');
    setOpenMenuId(null);
  };

  const toggleMenu = (sessionId) => {
    setOpenMenuId((prev) => (prev === sessionId ? null : sessionId));
  };

  // Settings Tab Components
  const ArchiveStorageTab = () => (
    <div className="space-y-4">
      <div className="text-white/80 text-sm mb-4">
        <p>Archived sessions from sidebar</p>
      </div>
      {archivedSessions?.length === 0 ? (
        <p className="text-white/40 text-center py-8">No archived sessions</p>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {archivedSessions?.map((session) => (
            <div key={session?.id} className="bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-medium">{session?.name}</h3>
                <span className="text-white/40 text-xs">{session?.archivedDate}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestoreSession(session?.id)}
                  className="text-xs bg-[#444444] hover:bg-[#555555] text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDeleteSession(session?.id)}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const CustomMemoryTab = () => {
    const [memoryText, setMemoryText] = useState('User prefers dark theme and minimal UI design.\n\nPrimary development stack: JavaScript, React with functional components and hooks.');
    const [isEditing, setIsEditing] = useState(false);
    const [tempMemoryText, setTempMemoryText] = useState(memoryText);

    return (
      <div className="space-y-4 flex flex-col h-full">
        <div className="text-white/80 text-sm mb-2">
          <p>Agent memory storage</p>
        </div>
        <div className="flex-1 bg-[#2a2a2a] rounded-xl p-4 overflow-y-auto">
          {isEditing ? (
            <textarea
              value={tempMemoryText}
              onChange={(e) => setTempMemoryText(e?.target?.value)}
              className="w-full h-full min-h-[200px] bg-transparent text-white text-sm focus:outline-none resize-none"
            />
          ) : (
            <div className="text-white/80 text-sm whitespace-pre-wrap">{memoryText}</div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-xl py-2.5 text-sm">Cancel</button>
              <button onClick={() => { setMemoryText(tempMemoryText); setIsEditing(false); }} className="flex-1 bg-[#444444] hover:bg-[#555555] text-white rounded-xl py-2.5 text-sm">Save</button>
            </>
          ) : (
            <button onClick={() => { setTempMemoryText(memoryText); setIsEditing(true); }} className="w-full bg-[#444444] hover:bg-[#555555] text-white rounded-xl py-2.5 text-sm">Edit Memory</button>
          )}
        </div>
      </div>
    );
  };

  const TerminalBoardTab = () => {
    return (
      <div className="w-full space-y-4">
        {/* Cloud Terminal Label */}
        <div className="text-white/80 text-sm">
          <p>Cloud terminal</p>
        </div>
        
        {/* Terminal Screen Only */}
        <div className="w-full rounded-2xl bg-black border border-white/10 overflow-hidden min-h-[280px]">
          {/* Moltbot agent terminal view */}
          <div className="p-4 font-mono text-sm text-green-400">
            <div>Terminal ready...</div>
            <div>Remote mode: standby</div>
          </div>
        </div>
      </div>
    );
  };

  if (isProjectsView) {
    return (
      <ProjectsView
        sessions={sessions}
        projects={projects}
        setProjects={setProjects}
        onOpenSession={setSelectedSession}
        onRenameSession={handleRename}
        onArchiveSession={handleArchive}
        onDeleteSession={handleDelete}
        onExitProjects={() => setIsProjectsView(false)}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[80] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 bottom-0 left-0 h-full bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl transform transition-all duration-300 ease-in-out z-[90] flex flex-col w-[85vw] max-w-[320px] md:w-[320px] border-r border-white/10 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Glass Header */}
        <div className="h-14 px-4 flex items-center justify-between bg-gradient-to-r from-[#2a2a2a]/80 to-[#333333]/80 backdrop-blur-md border-b border-white/10">
          {viewMode === 'sessions' ? (
            <>
              <button
                onClick={() => setViewMode('settings')}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Open settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              <p className="text-sm font-semibold text-white">Sessions</p>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </>
          ) : viewMode === 'settings' ? (
            <>
              <button
                onClick={() => setViewMode('sessions')}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Back to sessions"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <p className="text-sm font-semibold text-white">Settings</p>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </>
          ) : (
            <>
              <div className="w-10" />
              <p className="text-sm font-semibold text-white">Projects</p>
              <button onClick={onClose} className="h-10 w-10 rounded-lg hover:bg-white/10 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {viewMode === 'sessions' ? (
          <>
            {/* Action Buttons */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleAddSession}
                className="h-10 rounded-lg bg-[#444444] hover:bg-[#555555] text-white text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Session
              </button>
              <button
                onClick={() => setIsProjectsView(true)}
                className="h-10 rounded-lg bg-[#444444] hover:bg-[#555555] text-white text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <FolderPlus className="w-4 h-4" /> Projects
              </button>
            </div>

            {/* Session Stats */}
            <div className="px-4 pb-2 grid grid-cols-2 gap-2 text-center text-[11px] text-white/70">
              <div className="bg-[#2a2a2a] rounded-lg py-2">
                <p>Active</p>
                <p className="text-white text-sm font-semibold">{activeSessions?.length} / {MAX_ACTIVE_SESSIONS}</p>
              </div>
              <div className="bg-[#2a2a2a] rounded-lg py-2">
                <p>Archived</p>
                <p className="text-white text-sm font-semibold">{archivedSessions?.length}</p>
              </div>
            </div>

            {/* Scrollable Session List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 sticky top-0 bg-[#1a1a1a]/95 backdrop-blur py-1 z-10">
                Active Sessions ({activeSessions.length})
              </h3>
              
              {activeSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-white/50 text-sm">No active sessions</p>
                  <p className="text-white/30 text-xs mt-1">Create a new session to start</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map((session) => {
                    const isPinned = pinnedSessionIds.includes(session.id);
                    const isSelected = selectedSessionId === session.id;
                    
                    return (
                      <div
                        key={session.id}
                        className={`relative rounded-xl p-3 transition-all ${
                          isSelected 
                            ? 'bg-[#444444] border border-white/20' 
                            : 'bg-[#2a2a2a] hover:bg-[#333333]'
                        }`}
                      >
                        {editingId === session.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => handleRename(session.id, editName)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id, editName)}
                            className="w-full px-2 py-1 text-sm font-medium text-white bg-[#555555] border border-blue-500 rounded focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => handlePinToggle(session.id)}
                              className={`mt-0.5 transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/20 hover:text-white/50'}`}
                              aria-label={isPinned ? 'Unpin session' : 'Pin session'}
                            >
                              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                            </button>
                            
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => setSelectedSession(session.id)}
                            >
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                {session.name}
                              </p>
                              <p className="text-white/40 text-xs">{new Date(session.timestamp).toLocaleDateString()}</p>
                            </div>

                            <div className="relative" data-session-menu>
                              <button 
                                onClick={() => toggleMenu(session.id)} 
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                aria-label="Session options"
                              >
                                <MoreHorizontal className="w-4 h-4 text-white/60" />
                              </button>
                              
                              {openMenuId === session.id && (
                                <div className="absolute right-0 top-7 w-44 bg-[#222222] rounded-lg shadow-xl border border-white/10 py-1 z-20">
                                  <button 
                                    onClick={() => startEditing(session.id, session.name)} 
                                    className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />Rename
                                  </button>
                                  <button 
                                    onClick={() => handlePinToggle(session.id)} 
                                    className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                  >
                                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current text-yellow-400' : ''}`} />
                                    {isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                  {projects.length > 0 && (
                                    <button 
                                      onClick={() => setAddingToProject(session.id)} 
                                      className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                    >
                                      <FolderPlus className="w-3.5 h-3.5" />Add to Project
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleSplit(session.id)} 
                                    className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                  >
                                    <Split className="w-3.5 h-3.5" />Split
                                  </button>
                                  <button 
                                    onClick={() => handleArchive(session.id)} 
                                    className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                  >
                                    <Archive className="w-3.5 h-3.5" />Archive
                                  </button>
                                  <div className="border-t border-white/10 my-1" />
                                  <button 
                                    onClick={() => handleDelete(session.id)} 
                                    className="w-full px-3 py-2 text-left text-red-400 text-sm hover:bg-[#333333] flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Add to Project Dropdown */}
                        {addingToProject === session.id && projects.length > 0 && (
                          <div className="mt-2 p-2 bg-[#1a1a1a] rounded-lg border border-white/10">
                            <p className="text-xs text-white/60 mb-1">Select project:</p>
                            <div className="space-y-1">
                              {projects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => handleAddToProject(session.id, project.id)}
                                  className="w-full text-left px-2 py-1.5 text-sm text-white hover:bg-[#333333] rounded"
                                >
                                  {project.name}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setAddingToProject(null)}
                              className="w-full mt-1 text-xs text-white/50 hover:text-white py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : viewMode === 'settings' ? (
          <>
            {/* Settings Tabs */}
            <div className="px-4 py-3 space-y-1">
              {[
                { id: 'archive', label: 'Archive', icon: Archive },
                { id: 'memory', label: 'Memory', icon: Brain },
                { id: 'terminal', label: 'Terminal', icon: Terminal },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      settingsTab === tab.id
                        ? 'bg-[#444444] text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {settingsTab === 'archive' && <ArchiveStorageTab />}
              {settingsTab === 'memory' && <CustomMemoryTab />}
              {settingsTab === 'terminal' && <TerminalBoardTab />}
            </div>

            {/* Logout in Settings */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full h-11 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Log-out
              </button>
            </div>
          </>
        ) : null}

        <footer className="px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <span className="text-xs font-medium tracking-wide text-white/80">OMO-AI</span>
        </footer>
      </aside>
    </>
  );
};

export default OmoAiSidebar;
