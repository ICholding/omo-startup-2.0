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
  const [isConnected, setIsConnected] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(['Terminal ready...', 'Remote mode: standby']);
  const [command, setCommand] = useState('');

  const handleConnect = () => {
    setIsConnected(!isConnected);
    if (!isConnected) {
      setTerminalOutput(prev => [...prev, 'Connected to cloud terminal...']);
    } else {
      setTerminalOutput(prev => [...prev, 'Disconnected from cloud terminal.']);
    }
  };

  const handleCommand = (e) => {
    e?.preventDefault();
    if (command?.trim() && isConnected) {
      setTerminalOutput(prev => [...prev, `$ ${command}`, 'Command executed on remote worker...']);
      setCommand('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/80 text-sm">
          <p>Cloud terminal connection</p>
        </div>
        <button
          onClick={handleConnect}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isConnected
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Terminal Display */}
      <div className="bg-black/50 rounded-xl p-4 font-mono text-sm h-64 overflow-y-auto">
        {terminalOutput?.map((line, index) => (
          <div key={index} className="text-green-400 mb-1">
            {line}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {['status', 'sessions:list', 'worker:health'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCommand(preset)}
              disabled={!isConnected}
              className="px-2.5 py-1.5 text-xs rounded-md bg-[#2a2a2a] text-white/80 hover:bg-[#333333] disabled:opacity-40"
            >
              {preset}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTerminalOutput(['Terminal cleared.'])}
          className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30"
        >
          Clear
        </button>
      </div>

      {/* Command Input */}
      <form onSubmit={handleCommand} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e?.target?.value)}
          disabled={!isConnected}
          placeholder={isConnected ? 'Enter command...' : 'Connect to terminal first'}
          className="flex-1 bg-[#2a2a2a] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        />
        <button
          type="submit"
          disabled={!isConnected || !command?.trim()}
          className="bg-[#444444] hover:bg-[#555555] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Execute
        </button>
      </form>
    </div>
  );
};

export default SettingsDrawer;