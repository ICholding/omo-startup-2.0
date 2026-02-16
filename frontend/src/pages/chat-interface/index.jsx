import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import ChatHeader from '../../components/ui/ChatHeader';
import MessageInput from '../../components/ui/MessageInput';
import MessageBubble from './components/MessageBubble';
import OmoAiSidebar from './components/OmoAiSidebar';
import ThinkingIndicator from './components/ThinkingIndicator';
import { useSocket } from '../../hooks/useSocket';
import { usePageTransition, fadeVariants } from '../../config/animations';

const SESSION_ID_KEY = 'omo-session-id';
const CHAT_MESSAGES_KEY = 'omo-chat-messages';
const CHAT_MESSAGES_BY_SESSION_KEY = 'omo-chat-messages-by-session';
const CHAT_STATE_BY_SESSION_KEY = 'omo-chat-state-by-session';

/**
 * Automation Assistant Chat Interface
 * Real-time execution interface
 */
const ChatInterface = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSessionTitle, setActiveSessionTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showThinkingForCurrentRequest, setShowThinkingForCurrentRequest] = useState(false);
  const [conversationState, setConversationState] = useState('initial');

  const messagesEndRef = useRef(null);
  const pageVariants = usePageTransition(fadeVariants);

  const {
    isConnected,
    isConnecting,
    streamedResponse,
    isStreaming,
    executionState,
    suggestion,
    suggestions,
    thinkingMessage,
    sendMessage: sendSocketMessage
  } = useSocket(sessionId);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedResponse]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedSessionId) {
      setSessionId(storedSessionId);
      return;
    }

    const bootstrapSessionId = crypto.randomUUID();
    setSessionId(bootstrapSessionId);
    localStorage.setItem(SESSION_ID_KEY, bootstrapSessionId);
  }, []);

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

  useEffect(() => {
    if (!streamedResponse) return;

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
  }, [streamedResponse, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setShowThinkingForCurrentRequest(false);
      setConversationState('waiting-for-response');
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!sessionId) return;

    try {
      const raw = localStorage.getItem(CHAT_STATE_BY_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed?.[sessionId]?.conversationState) {
        setConversationState(parsed[sessionId].conversationState);
      } else {
        setConversationState('initial');
      }
    } catch {
      setConversationState('initial');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(CHAT_STATE_BY_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[sessionId] = { conversationState };
      localStorage.setItem(CHAT_STATE_BY_SESSION_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, [sessionId, conversationState]);

  const ensureSessionId = () => {
    if (sessionId) {
      return sessionId;
    }

    const nextSessionId = crypto.randomUUID();
    setSessionId(nextSessionId);
    localStorage.setItem(SESSION_ID_KEY, nextSessionId);
    return nextSessionId;
  };

  const handleSendMessage = async (messageText, attachments = []) => {
    if (!messageText.trim() && attachments.length === 0) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationState('active-task');

    const context = messages.slice(-5).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const activeSessionId = ensureSessionId();
    const wasSent = sendSocketMessage(messageText, context, activeSessionId);
    setShowThinkingForCurrentRequest(true);

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
  };

  const handleSuggestionClick = (suggestionText) => {
    handleSendMessage(suggestionText);
  };

  const handleActiveSessionChange = (sessionInfo) => {
    const nextTitle = typeof sessionInfo === 'string' ? sessionInfo : sessionInfo?.name;
    const nextSessionId = sessionInfo?.id || null;

    setActiveSessionTitle(nextTitle || '');

    if (nextSessionId !== sessionId) {
      // Reset chat state for new session
      setMessages([]);
      setConversationState('initial');
      setSessionId(nextSessionId);

      if (nextSessionId) {
        localStorage.setItem(SESSION_ID_KEY, nextSessionId);
      } else {
        localStorage.removeItem(SESSION_ID_KEY);
      }

      // Reset agent state for new session
      localStorage.removeItem(CHAT_MESSAGES_KEY);

    }
  };
  
  // Handle creating new session from sidebar
  const handleNewSession = (requestedName = '') => {
    const newSessionId = crypto.randomUUID();
    const newSessionName = requestedName?.trim() || '';

    // Reset all chat state
    setMessages([]);
    setConversationState('initial');
    setSessionId(newSessionId);
    setActiveSessionTitle(newSessionName);
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    localStorage.removeItem(CHAT_MESSAGES_KEY);

    // Reset agent automation state
    setShowThinkingForCurrentRequest(false);

    return { id: newSessionId, name: newSessionName };
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
      setShowThinkingForCurrentRequest(false);
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHAT_MESSAGES_KEY);
    }
  };

  const isSidebarActive = isSidebarOpen;
  const chatSurfaceClassName = `relative flex flex-col h-screen bg-background transition-opacity duration-300 ${isSidebarActive ? 'pointer-events-none select-none opacity-75' : 'opacity-100'}`;

  const renderBlankState = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight text-center">Assistant</h1>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Automation Assistant</title>
        <meta
          name="description"
          content="Automation Assistant - simplify complex tasks into automated outcomes with structured logs."
        />
        <meta
          name="keywords"
          content="automation assistant, productivity, workflows, execution logs"
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
            className={chatSurfaceClassName}
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

            <main className="flex-1 overflow-y-auto smooth-scroll pt-14 pb-24">
              <div className="message-container relative mx-auto max-w-5xl min-h-[65vh] px-2 sm:px-4 py-3 sm:py-4">
                {messages?.length === 0 ? (
                  renderBlankState()
                ) : (
                  <>
                    {messages?.map((message, index) => {
                      const isAgent = message?.sender === 'agent';
                      const showAvatar = isAgent && (index === 0 || messages?.[index - 1]?.sender !== 'agent');

                      return (
                        <div key={message?.id} className="message-group">
                          <MessageBubble
                            message={message}
                            showAvatar={showAvatar}
                            isAgent={isAgent}
                            isStreaming={message?.isStreaming}
                            executionState={null}
                          />
                        </div>
                      );
                    })}

                    {showThinkingForCurrentRequest && isStreaming && executionState !== 'responding' && (
                      <div className="message-group">
                        <ThinkingIndicator label={thinkingMessage} state={executionState} />
                      </div>
                    )}

                    {(suggestions?.length > 0 || suggestion) && !isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap items-center gap-2 mt-4 ml-12"
                      >
                        <span className="text-xs text-gray-500">Try next:</span>
                        {(suggestions?.length > 0 ? suggestions : [suggestion]).filter(Boolean).map((item) => (
                          <button
                            key={item}
                            onClick={() => handleSuggestionClick(item)}
                            className="px-3 py-1 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-full transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </main>

            {!isSidebarActive && (
              <>
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={isStreaming}
                  isAgentWorking={isStreaming}
                  placeholder={isConnected ? 'Describe what you want automated...' : 'Disconnected...'}
                />
              </>
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
