import React, { useState } from 'react';
import { X, Edit2, Trash2, Archive, User } from 'lucide-react';

const ChatHistorySidebar = ({ isOpen, onClose }) => {
  const [chats, setChats] = useState([
    { id: 1, title: 'New Chat', timestamp: new Date(), archived: false },
    { id: 2, title: 'Previous Conversation', timestamp: new Date(Date.now() - 86400000), archived: false },
    { id: 3, title: 'Legal Consultation', timestamp: new Date(Date.now() - 172800000), archived: false },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleRename = (id, newTitle) => {
    if (newTitle?.trim()) {
      setChats(prev => prev?.map(chat => 
        chat?.id === id ? { ...chat, title: newTitle?.trim() } : chat
      ));
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (id) => {
    setChats(prev => prev?.filter(chat => chat?.id !== id));
  };

  const handleArchive = (id) => {
    setChats(prev => prev?.map(chat => 
      chat?.id === id ? { ...chat, archived: !chat?.archived } : chat
    ));
  };

  const startEditing = (id, currentTitle) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date?.toLocaleDateString();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chats?.filter(chat => !chat?.archived)?.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-8">No chats yet</p>
          ) : (
            chats?.filter(chat => !chat?.archived)?.map(chat => (
              <div
                key={chat?.id}
                className="group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              >
                {editingId === chat?.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e?.target?.value)}
                    onBlur={() => handleRename(chat?.id, editTitle)}
                    onKeyPress={(e) => {
                      if (e?.key === 'Enter') {
                        handleRename(chat?.id, editTitle);
                      }
                    }}
                    className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat?.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(chat?.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={() => startEditing(chat?.id, chat?.title)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        aria-label="Rename chat"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleArchive(chat?.id)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        aria-label="Archive chat"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(chat?.id)}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        aria-label="Delete chat"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Archived Section */}
          {chats?.filter(chat => chat?.archived)?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Archived
              </h3>
              {chats?.filter(chat => chat?.archived)?.map(chat => (
                <div
                  key={chat?.id}
                  className="group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-600 truncate">
                        {chat?.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(chat?.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={() => handleArchive(chat?.id)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        aria-label="Unarchive chat"
                        title="Unarchive"
                      >
                        <Archive className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(chat?.id)}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        aria-label="Delete chat"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Section at Bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">User Profile</p>
              <p className="text-xs text-gray-500">Manage account</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatHistorySidebar;
