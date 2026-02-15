import React, { useState } from 'react';
import { ArrowLeft, LogOut, Archive, Brain, Terminal } from 'lucide-react';

const SettingsDrawer = ({ isOpen, onClose, archivedSessions = [], onRestoreSession, onDeleteSession, onLogOut }) => {
  const [activeTab, setActiveTab] = useState('archive');

  const tabs = [
    { id: 'archive', label: 'Archive Storage', icon: Archive },
    { id: 'memory', label: 'Custom Memory', icon: Brain },
    { id: 'terminal', label: 'Terminal Board', icon: Terminal },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 transition-all duration-300 z-[60] ${
          isOpen ? 'bg-black/60' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Settings Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-[90vw] max-w-[340px] bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out z-[70] flex flex-col rounded-l-3xl border-l border-white/10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Back to sidebar"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <div className="w-9" aria-hidden="true" />
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-4 space-y-2">
          {tabs?.map((tab) => {
            const Icon = tab?.icon;
            return (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab?.id
                    ? 'bg-[#444444] text-white shadow-lg'
                    : 'bg-transparent text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab?.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'archive' && <ArchiveStorageTab archivedSessions={archivedSessions} onRestoreSession={onRestoreSession} onDeleteSession={onDeleteSession} />}
          {activeTab === 'memory' && <CustomMemoryTab />}
          {activeTab === 'terminal' && <TerminalBoardTab />}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogOut}
            className="w-full h-11 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log-out
          </button>
        </div>
      </div>
    </>
  );
};

// Archive Storage Tab Component
const ArchiveStorageTab = ({ archivedSessions = [], onRestoreSession, onDeleteSession }) => {
  const handleRestore = (sessionId) => {
    if (onRestoreSession) {
      onRestoreSession(sessionId);
    }
  };

  const handleDelete = (sessionId) => {
    if (onDeleteSession) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-white/80 text-sm mb-4">
        <p>Archived sessions from sidebar</p>
      </div>
      {archivedSessions?.length > 20 && (
        <p className="text-white/40 text-[11px]">Scroll to browse all archived sessions.</p>
      )}

      {archivedSessions?.length === 0 ? (
        <p className="text-white/40 text-center py-8">No archived sessions</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {archivedSessions?.map((session) => (
            <div
              key={session?.id}
              className="bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-medium">{session?.name}</h3>
                <span className="text-white/40 text-xs">{session?.archivedDate}</span>
              </div>
              <p className="text-white/60 text-sm mb-3">{session?.snippet}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(session?.id)}
                  className="text-xs bg-[#444444] hover:bg-[#555555] text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Restore Session
                </button>
                <button
                  onClick={() => handleDelete(session?.id)}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom Memory Tab Component
const CustomMemoryTab = () => {
  const [memoryText, setMemoryText] = useState('User prefers dark theme and minimal UI design.\n\nPrimary development stack: JavaScript, React with functional components and hooks.\n\nProject context: OMO-AI chat interface with advanced agent features.\n\nCoding style: Clean, modular code with proper component separation.');
  const [isEditing, setIsEditing] = useState(false);
  const [tempMemoryText, setTempMemoryText] = useState(memoryText);

  const handleEditMemory = () => {
    setIsEditing(true);
    setTempMemoryText(memoryText);
  };

  const handleSaveMemory = () => {
    setMemoryText(tempMemoryText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempMemoryText(memoryText);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="text-white/80 text-sm mb-2">
        <p>Agent memory storage - Important context from chats</p>
      </div>
      
      {/* Memory Display/Edit Area */}
      <div className="flex-1 bg-[#2a2a2a] rounded-xl p-4 overflow-y-auto">
        {isEditing ? (
          <textarea
            value={tempMemoryText}
            onChange={(e) => setTempMemoryText(e?.target?.value)}
            className="w-full h-full min-h-[300px] bg-transparent text-white text-sm focus:outline-none resize-none"
            placeholder="Agent writes and stores important memory from chats here..."
          />
        ) : (
          <div className="text-white/80 text-sm whitespace-pre-wrap">
            {memoryText || 'No memory stored yet. Agent will write important context from conversations here.'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {isEditing ? (
          <>
            <button
              onClick={handleCancelEdit}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-xl py-2.5 px-4 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMemory}
              className="flex-1 bg-[#444444] hover:bg-[#555555] text-white rounded-xl py-2.5 px-4 transition-colors font-medium text-sm"
            >
              Save
            </button>
          </>
        ) : (
          <button
            onClick={handleEditMemory}
            className="w-full bg-[#444444] hover:bg-[#555555] text-white rounded-xl py-2.5 px-4 transition-colors font-medium text-sm"
          >
            Edit Memory
          </button>
        )}
      </div>
    </div>
  );
};

// Terminal Board Tab Component
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

export default SettingsDrawer;