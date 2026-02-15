import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '../config/api';

const formatExecutionPackage = (payload = {}) => {
  const summary = payload?.summary || 'Task executed.';
  const activityLog = Array.isArray(payload?.activityLog) ? payload.activityLog : [];
  const diagnostics = payload?.meta?.diagnostics;
  const sections = payload?.sections || {};
  const sectionEntries = Object.entries(sections);

  const segmentedSection = sectionEntries.length > 0
    ? `\n\n${sectionEntries.map(([title, body]) => `**${title}**\n${body}`).join('\n\n')}`
    : '';

  const activitySection = activityLog.length > 0
    ? `\n\n**Activity Log**\n${activityLog
      .map((entry) => `- ${entry?.title || entry?.type || 'activity'}${entry?.detail ? `: ${entry.detail}` : ''}`)
      .join('\n')}`
    : '';

  const diagnosticSection = diagnostics
    ? `\n\n**Diagnostics**\n- Session: ${diagnostics.sessionId || 'unknown'}\n- Context Messages: ${diagnostics.contextMessages ?? 0}\n- Active Connections: ${diagnostics.activeConnections ?? 0}`
    : '';

  return `**Summary**\n${summary}${segmentedSection}${activitySection}${diagnosticSection}`;
};

/**
 * Automation Assistant Socket.IO Hook
 * Shadow execution mode: minimal frontend state and final package rendering.
 */
export const useSocket = (sessionId) => {
  const socketRef = useRef(null);
  const pendingChatMessageRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [executionState, setExecutionState] = useState('idle'); // idle | thinking | responding | error
  const [suggestion, setSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [thinkingMessage, setThinkingMessage] = useState('Thinking...');
  const [executionPackage, setExecutionPackage] = useState(null);

  const sendChatPayload = useCallback((payload) => {
    if (!socketRef.current || !payload) {
      return false;
    }

    socketRef.current.emit('chat-message', payload);
    return true;
  }, []);

  useEffect(() => {
    const socketUrl = getSocketBaseUrl();
    const socketPath = import.meta.env?.VITE_SOCKET_PATH || '/socket.io';

    socketRef.current = io(socketUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    const onConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);

      const pendingSessionId = pendingChatMessageRef.current?.sessionId;
      const activeSessionId = pendingSessionId || sessionId;

      if (activeSessionId) {
        socket.emit('join-session', activeSessionId);
      }
      if (pendingChatMessageRef.current) {
        sendChatPayload(pendingChatMessageRef.current);
        pendingChatMessageRef.current = null;
      }
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error('[Socket] Connection error:', error);
      setIsConnecting(false);
    };

    const onExecutionStart = (data) => {
      setExecutionState('thinking');
      setThinkingMessage(data?.message || 'Thinking...');
      setIsStreaming(true);
      setStreamedResponse('');
      setExecutionPackage(null);
      setSuggestion(null);
      setSuggestions([]);
    };

    const onExecutionComplete = (data) => {
      setExecutionPackage(data);
      setStreamedResponse(formatExecutionPackage(data));
      const nextSuggestions = Array.isArray(data?.nextActions) ? data.nextActions.slice(0, 3) : [];
      setSuggestions(nextSuggestions);
      setSuggestion(nextSuggestions[0] || null);
      setIsStreaming(false);
      setExecutionState('idle');
    };

    const onExecutionError = (data) => {
      setExecutionState('error');
      setStreamedResponse(`**Error:** ${data?.error || 'Failed to process request.'}`);
      setIsStreaming(false);
    };

    // Backward compatibility with prior event protocol
    const onAgentThinking = (data) => {
      setExecutionState('thinking');
      setThinkingMessage(data?.message || 'Thinking...');
      setIsStreaming(true);
    };

    const onResponseComplete = (data) => {
      setStreamedResponse(data?.fullResponse || '');
      setIsStreaming(false);
      setExecutionState('idle');
    };

    const onToolError = (data) => {
      setExecutionState('error');
      setStreamedResponse((prev) => `${prev}\n\n**Error:** ${data?.error || 'Unknown error'}`.trim());
      setIsStreaming(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('execution-start', onExecutionStart);
    socket.on('execution-complete', onExecutionComplete);
    socket.on('execution-error', onExecutionError);
    socket.on('agent-thinking', onAgentThinking);
    socket.on('response-complete', onResponseComplete);
    socket.on('tool-error', onToolError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('execution-start', onExecutionStart);
      socket.off('execution-complete', onExecutionComplete);
      socket.off('execution-error', onExecutionError);
      socket.off('agent-thinking', onAgentThinking);
      socket.off('response-complete', onResponseComplete);
      socket.off('tool-error', onToolError);
      socket.disconnect();
    };
  }, [sessionId, sendChatPayload]);

  const sendMessage = useCallback((message, context = [], overrideSessionId = null) => {
    const targetSessionId = overrideSessionId || sessionId;

    if (!socketRef.current || !targetSessionId) {
      return false;
    }

    const payload = {
      message,
      sessionId: targetSessionId,
      context
    };

    if (!isConnected) {
      pendingChatMessageRef.current = payload;
      setIsConnecting(true);
      socketRef.current.connect();
    } else {
      socketRef.current.emit('join-session', targetSessionId);
      sendChatPayload(payload);
    }

    setStreamedResponse('');
    setThinkingMessage('Thinking...');
    setIsStreaming(true);
    setSuggestion(null);
    setSuggestions([]);
    setExecutionPackage(null);
    setExecutionState('thinking');

    return true;
  }, [sessionId, isConnected, sendChatPayload]);

  const executeTool = useCallback((toolName, params) => {
    if (!socketRef.current || !isConnected || !sessionId) {
      return false;
    }

    socketRef.current.emit('execute-tool', {
      toolName,
      params,
      sessionId
    });

    return true;
  }, [sessionId, isConnected]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      setIsConnecting(true);
      socketRef.current.connect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    streamedResponse,
    isStreaming,
    executionState,
    suggestion,
    suggestions,
    thinkingMessage,
    executionPackage,
    reasoning: '',
    isReasoning: false,
    showReasoning: false,
    setShowReasoning: () => {},
    sendMessage,
    executeTool,
    reconnect
  };
};
