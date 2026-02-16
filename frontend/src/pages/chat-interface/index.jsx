import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ExternalThread } from '@assistant-ui/react';
import { AuiProvider } from '@assistant-ui/store';
import ChatHeader from '../../components/ui/ChatHeader';
import MessageInput from '../../components/ui/MessageInput';
import OmoAiSidebar from './components/OmoAiSidebar';
import { useSocket } from '../../hooks/useSocket';
import { usePageTransition, fadeVariants } from '../../config/animations';
import { 
  initializeSessions, 
  setActiveSessionId,
  getSessionById,
  addSession,
} from '../../utils/sessionManager';

import '@assistant-ui/react-ui/styles/index.css';

const SESSION_ID_KEY = 'omo-session-id';
const CHAT_MESSAGES_KEY = 'omo-chat-messages';
const CHAT_MESSAGES_BY_SESSION_KEY = 'omo-chat-messages-by-session';
const CHAT_STATE_BY_SESSION_KEY = 'omo-chat-state-by-session';

/**
 * Automation Assistant Chat Interface
 * Hybrid approach using assistant-ui ExternalThread with OMO execution engine
 */
const ChatInterface = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSessionTitle, setActiveSessionTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [conversationState, setConversationState] = useState('initial');
  const [isPaused, setIsPaused] = useState(false);

  const pageVariants = usePageTransition(fadeVariants);

  const {
    isConnected,
    isConnecting,
    streamedResponse,
    isStreaming,
    executionState,
    suggestion,
    suggestions,
    sendMessage: sendSocketMessage
  } = useSocket(sessionId);

  // Initialize session on mount
  useEffect(() => {
    const activeSession = initializeSessions();
    if (activeSession) {
      setSessionId(activeSession.id);
      setActiveSessionTitle(activeSession.name);
      localStorage.setItem(SESSION_ID_KEY, activeSession.id);
    }
  }, []);

  // Load messages for current session
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setConversationState('initial');
      return;
    }

    try {
      const storedMap = localStorage.getItem(CHAT_MESSAGES_BY_SESSION_KEY);
      const parsed = storedMap ? JSON.parse(storedMap) : {};
      const sessionMessages = parsed?.[sessionId];

      if (Array.isArray(sessionMessages)) {
        setMessages(sessionMessages);
      } else {
        const legacy = localStorage.getItem(CHAT_MESSAGES_KEY);
        setMessages(legacy ? JSON.parse(legacy) : []);
      }
    } catch {
      setMessages([]);
    }
  }, [sessionId]);

  // Persist messages
  useEffect(() => {
    if (!sessionId) return;

    try {
      const storedMap = localStorage.getItem(CHAT_MESSAGES_BY_SESSION_KEY);
      const parsed = storedMap ? JSON.parse(storedMap) : {};
      const next = { ...parsed, [sessionId]: messages };

      localStorage.setItem(CHAT_MESSAGES_BY_SESSION_KEY, JSON.stringify(next));
      localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage write issues
    }
  }, [messages, sessionId]);

  // Handle pause/resume toggle
  const handleTogglePause = useCallback(() => {
    if (!isStreaming) return;
    setIsPaused((prev) => !prev);
  }, [isStreaming]);

  // Reset pause state when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      setIsPaused(false);
    }
  }, [isStreaming]);

  // Convert messages to assistant-ui format
  const threadMessages = useMemo(() => {
    return messages.map((msg) => ({
      id: msg.id,
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: [{ type: 'text', text: msg.content }],
      createdAt: new Date(msg.timestamp),
      ...(msg.attachments && { attachments: msg.attachments })
    }));
  }, [messages]);

  // Handle new message from assistant-ui
  const handleNewMessage = useCallback((message) => {
    const content = message.content?.[0]?.text || message.content;
    if (!content) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: content,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationState('active-task');
    setIsPaused(false);

    const context = messages.slice(-5).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const wasSent = sendSocketMessage(content, context, sessionId);

    if (!wasSent && !isConnecting) {
      setConversationState('error-handling');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          content: 'Connection issue: unable to reach backend. Please retry once connected.',
          timestamp: new Date().toISOString(),
          isNew: true
        }
      ]);
    }
  }, [messages, sessionId, sendSocketMessage, isConnecting]);

  // Handle cancel/pause
  const handleCancel = useCallback(() => {
    handleTogglePause();
  }, [handleTogglePause]);

  // Process streamed response
  useEffect(() => {
    if (!streamedResponse || isPaused) return;

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.sender === 'agent' && lastMessage?.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: streamedResponse,
            isStreaming,
            isNew: !isStreaming
          }
        ];
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          content: streamedResponse,
          timestamp: new Date().toISOString(),
          isStreaming,
          isNew: !isStreaming
        }
      ];
    });
  }, [streamedResponse, isStreaming, isPaused]);

  const ensureSessionId = () => {
    if (sessionId) return sessionId;
    const nextSessionId = crypto.randomUUID();
    setSessionId(nextSessionId);
    localStorage.setItem(SESSION_ID_KEY, nextSessionId);
    return nextSessionId;
  };

  const handleSuggestionClick = (suggestionText) => {
    handleNewMessage({ content: [{ type: 'text', text: suggestionText }] });
  };

  const handleActiveSessionChange = (sessionInfo) => {
    const nextTitle = typeof sessionInfo === 'string' ? sessionInfo : sessionInfo?.name;
    const nextSessionId = sessionInfo?.id || null;

    if (nextSessionId && nextSessionId !== sessionId) {
      setActiveSessionId(nextSessionId);
      const session = getSessionById(nextSessionId);
      const sessionName = session?.name || nextTitle || '';
      
      setActiveSessionTitle(sessionName);
      setSessionId(nextSessionId);
      setMessages([]);
      setConversationState('initial');
      setIsPaused(false);
      
      localStorage.setItem(SESSION_ID_KEY, nextSessionId);
      localStorage.removeItem(CHAT_MESSAGES_KEY);
    }
  };
  
  const handleNewSession = (requestedName = '') => {
    const newSession = addSession(requestedName);
    if (!newSession) return null;

    setMessages([]);
    setConversationState('initial');
    setSessionId(newSession.id);
    setActiveSessionTitle(newSession.name);
    setIsPaused(false);
    
    localStorage.setItem(SESSION_ID_KEY, newSession.id);
    localStorage.removeItem(CHAT_MESSAGES_KEY);

    return { id: newSession.id, name: newSession.name };
  };

  const handleSessionUpdate = ({ type, sessionId: updatedSessionId, name }) => {
    if (!updatedSessionId || updatedSessionId !== sessionId) return;

    if (type === 'renamed' && typeof name === 'string') {
      setActiveSessionTitle(name);
      return;
    }

    if (type === 'archived' || type === 'deleted') {
      setMessages([]);
      setConversationState('initial');
      setSessionId(null);
      setActiveSessionTitle('');
      setIsPaused(false);
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHAT_MESSAGES_KEY);
    }
  };

  const isSidebarActive = isSidebarOpen;

  return (
    <>
      <Helmet>
        <title>Automation Assistant</title>
        <meta
          name="description"
          content="Automation Assistant - simplify complex tasks into automated outcomes with structured logs."
        />
      </Helmet>

      <div className="flex flex-col h-screen bg-background transition-colors">
        {isConnecting ? (
          <motion.div
            className="flex-1 flex items-center justify-center"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Connecting to Automation Assistant...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className={`relative flex flex-col h-screen bg-background transition-opacity duration-300 ${
              isSidebarActive ? 'pointer-events-none select-none opacity-75' : 'opacity-100'
            }`}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div
              className={`pointer-events-none absolute inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
                isSidebarActive ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden="true"
            />

            <ChatHeader
              onMenuClick={() => setIsSidebarOpen(true)}
              sessionTitle={activeSessionTitle}
              isConnected={isConnected}
            />

            <AuiProvider>
              <main className="flex-1 overflow-hidden flex flex-col pt-14">
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-28 sm:pb-32">
                  <ExternalThread
                    messages={threadMessages}
                    isRunning={isStreaming && !isPaused}
                    onNew={handleNewMessage}
                    onCancel={handleCancel}
                  />
                </div>

                {isPaused && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 py-2"
                  >
                    <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                      Paused
                    </span>
                  </motion.div>
                )}

                {(suggestions?.length > 0 || suggestion) && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center justify-center gap-2 px-4 py-2"
                  >
                    <span className="text-xs text-gray-500">Try next:</span>
                    {(suggestions?.length > 0 ? suggestions : [suggestion])
                      .filter(Boolean)
                      .map((item) => (
                        <button
                          key={item}
                          onClick={() => handleSuggestionClick(item)}
                          className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 hover:bg-gray-700 rounded-full transition-colors border border-gray-600"
                        >
                          {item}
                        </button>
                      ))}
                  </motion.div>
                )}
              </main>
            </AuiProvider>

            {!isSidebarActive && (
              <MessageInput
                onSendMessage={(text) => handleNewMessage({ content: [{ type: 'text', text }] })}
                disabled={isStreaming && isPaused}
                isAgentWorking={isStreaming}
                isPaused={isPaused}
                onTogglePause={handleTogglePause}
                placeholder={isConnected ? 'Describe what you want automated...' : 'Disconnected...'}
              />
            )}
          </motion.div>
        )}

        <OmoAiSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onActiveSessionChange={handleActiveSessionChange}
          onNewSession={handleNewSession}
          currentSessionId={sessionId}
          onSessionUpdate={handleSessionUpdate}
        />
      </div>
    </>
  );
};

export default ChatInterface;
