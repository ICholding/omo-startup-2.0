import React, { useMemo, useState } from 'react';
import { X, MoreHorizontal, Edit2, Trash2, Archive, FolderPlus } from 'lucide-react';

const ProjectsView = ({
  isOpen,
  onClose,
  onExitProjects,
  projects,
  setProjects,
  sessions,
  onOpenSession,
  onRenameSession,
  onArchiveSession,
  onDeleteSession,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editName, setEditName] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project?.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const projectSessions = useMemo(() => {
    if (!selectedProject) return [];
    const projectSessionIds = Array.isArray(selectedProject?.sessionIds) ? selectedProject.sessionIds : [];
    return projectSessionIds
      .map((id) => sessions.find((session) => session?.id === id))
      .filter(Boolean);
  }, [selectedProject, sessions]);

  const handleCreateProject = () => {
    const newProject = {
      id: `project-${Date.now()}`,
      name: `Project ${projects.length + 1}`,
      createdDate: new Date().toISOString().split('T')[0],
      sessionIds: [],
      archived: false,
    };
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleRenameProject = (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setEditingProjectId(null);
      setEditName('');
      return;
    }

    setProjects((prev) => prev.map((project) => (project?.id === id ? { ...project, name: trimmed } : project)));
    setEditingProjectId(null);
    setEditName('');
    setOpenMenuId(null);
  };

  const handleArchiveProject = (id) => {
    setProjects((prev) => prev.map((project) => (project?.id === id ? { ...project, archived: true } : project)));
    if (selectedProjectId === id) setSelectedProjectId(null);
    setOpenMenuId(null);
  };

  const handleDeleteProject = (id) => {
    setProjects((prev) => prev.filter((project) => project?.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
    setOpenMenuId(null);
  };

  const handleRemoveSessionFromProject = (projectId, sessionId) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project?.id !== projectId) return project;
        const nextIds = (project?.sessionIds || []).filter((id) => id !== sessionId);
        return { ...project, sessionIds: nextIds };
      })
    );
  };

  const visibleProjects = projects.filter((project) => !project?.archived);

  return (
    <>
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
        <div className="h-14 px-4 flex items-center justify-between bg-gradient-to-r from-[#2a2a2a]/80 to-[#333333]/80 backdrop-blur-md border-b border-white/10">
          {selectedProject ? (
            <>
              <button
                onClick={() => setSelectedProjectId(null)}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Back to projects"
              >
                <X className="w-5 h-5 text-white rotate-45" />
              </button>
              <p className="text-sm font-semibold text-white truncate max-w-[170px]">{selectedProject?.name}</p>
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
              <button
                onClick={onExitProjects}
                className="h-10 px-3 rounded-lg bg-[#444444] hover:bg-[#555555] text-white text-xs font-medium"
              >
                Exit
              </button>
              <p className="text-sm font-semibold text-white">Projects</p>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {!selectedProject ? (
          <>
            <div className="px-4 py-3">
              <button
                onClick={handleCreateProject}
                className="w-full h-10 rounded-lg bg-[#444444] hover:bg-[#555555] text-white text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <FolderPlus className="w-4 h-4" /> Create Project Folder
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {visibleProjects.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-white/50 text-sm">No projects yet</p>
                </div>
              ) : (
                visibleProjects.map((project) => {
                  const projectSessionCount = Array.isArray(project?.sessionIds) ? project.sessionIds.length : 0;

                  return (
                    <div key={project?.id} className="relative rounded-xl p-3 bg-[#2a2a2a] hover:bg-[#333333]">
                      {editingProjectId === project?.id ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          onBlur={() => handleRenameProject(project?.id, editName)}
                          onKeyDown={(event) => event.key === 'Enter' && handleRenameProject(project?.id, editName)}
                          className="w-full px-2 py-1 text-sm font-medium text-white bg-[#555555] border border-blue-500 rounded focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-left flex-1 min-w-0"
                            onClick={() => setSelectedProjectId(project?.id)}
                          >
                            <p className="text-sm font-medium text-white truncate">{project?.name}</p>
                            <p className="text-white/50 text-xs mt-1">{projectSessionCount} sessions</p>
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId((prev) => (prev === project?.id ? null : project?.id))}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              aria-label="Project options"
                            >
                              <MoreHorizontal className="w-4 h-4 text-white/60" />
                            </button>

                            {openMenuId === project?.id && (
                              <div className="absolute right-0 top-7 w-44 bg-[#222222] rounded-lg shadow-xl border border-white/10 py-1 z-20">
                                <button
                                  onClick={() => {
                                    setEditingProjectId(project?.id);
                                    setEditName(project?.name || '');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />Rename
                                </button>
                                <button
                                  onClick={() => handleArchiveProject(project?.id)}
                                  className="w-full px-3 py-2 text-left text-white text-sm hover:bg-[#333333] flex items-center gap-2"
                                >
                                  <Archive className="w-3.5 h-3.5" />Archive
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project?.id)}
                                  className="w-full px-3 py-2 text-left text-red-400 text-sm hover:bg-[#333333] flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {projectSessions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-white/50 text-sm">No sessions in this project</p>
                <p className="text-white/30 text-xs mt-1">Use “Add to Project” from session menu</p>
              </div>
            ) : (
              projectSessions.map((session) => (
                <div key={session?.id} className="relative rounded-xl p-3 bg-[#2a2a2a] hover:bg-[#333333]">
                  <button className="w-full text-left" onClick={() => onOpenSession(session?.id)}>
                    <p className="text-sm font-medium text-white truncate">{session?.name}</p>
                    <p className="text-white/40 text-xs mt-1">{new Date(session?.timestamp).toLocaleDateString()}</p>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        const nextName = window.prompt('Rename session', session?.name || '');
                        if (nextName && nextName.trim()) {
                          onRenameSession(session?.id, nextName.trim());
                        }
                      }}
                      className="text-[11px] px-2 py-1 rounded bg-white/10 text-white/80"
                    >
                      Rename
                    </button>
                    <button onClick={() => onArchiveSession(session?.id)} className="text-[11px] px-2 py-1 rounded bg-white/10 text-white/80">Archive</button>
                    <button onClick={() => onDeleteSession(session?.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-300">Delete</button>
                    <button onClick={() => handleRemoveSessionFromProject(selectedProject?.id, session?.id)} className="text-[11px] px-2 py-1 rounded bg-white/10 text-white/80">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <footer className="px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <span className="text-xs font-medium tracking-wide text-white/80">OMO-AI</span>
        </footer>
      </aside>
    </>
  );
};

export default ProjectsView;
