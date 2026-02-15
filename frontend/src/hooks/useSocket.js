import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiUrl } from '../config/api';

const formatExecutionPackage = (payload = {}) => {
  const summary = payload?.summary || 'Task executed.';
  const activityLog = Array.isArray(payload?.activityLog) ? payload.activityLog : [];
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

  return `**Summary**\n${summary}${segmentedSection}${activitySection}`;
};

export const useSocket = (sessionId) => {
  const streamRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [executionState, setExecutionState] = useState('idle');
  const [suggestion, setSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [thinkingMessage, setThinkingMessage] = useState('Thinking...');
  const [executionPackage, setExecutionPackage] = useState(null);

  const resetStreamingState = () => {
    setStreamedResponse('');
    setThinkingMessage('Thinking...');
    setIsStreaming(true);
    setSuggestion(null);
    setSuggestions([]);
    setExecutionPackage(null);
    setExecutionState('thinking');
  };

  const closeCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => closeCurrentStream(), [closeCurrentStream]);

  const sendMessage = useCallback((message, context = [], overrideSessionId = null) => {
    const activeSessionId = overrideSessionId || sessionId;
    if (!activeSessionId || !message?.trim()) {
      return false;
    }

    closeCurrentStream();
    resetStreamingState();
    setIsConnecting(true);

    const params = new URLSearchParams({
      sessionId: activeSessionId,
      message,
      context: JSON.stringify(context)
    });

    const stream = new EventSource(getApiUrl(`/api/chat/stream?${params.toString()}`));
    streamRef.current = stream;

    stream.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    stream.addEventListener('execution-start', (event) => {
      const data = JSON.parse(event.data || '{}');
      setExecutionState('thinking');
      setThinkingMessage(data?.message || 'Thinking...');
    });

    stream.addEventListener('response', (event) => {
      const data = JSON.parse(event.data || '{}');
      setStreamedResponse(data?.message || '');
    });

    stream.addEventListener('execution-complete', (event) => {
      const data = JSON.parse(event.data || '{}');
      setExecutionPackage(data);
      setStreamedResponse(formatExecutionPackage(data));
      const nextSuggestions = Array.isArray(data?.nextActions) ? data.nextActions.slice(0, 3) : [];
      setSuggestions(nextSuggestions);
      setSuggestion(nextSuggestions[0] || null);
      setExecutionState('idle');
      setIsStreaming(false);
    });

    stream.addEventListener('execution-error', (event) => {
      const data = JSON.parse(event.data || '{}');
      setExecutionState('error');
      setStreamedResponse(`**Error:** ${data?.error || 'Failed to process request.'}`);
      setIsStreaming(false);
      setIsConnecting(false);
      setIsConnected(false);
      closeCurrentStream();
    });

    stream.addEventListener('done', () => {
      setIsConnecting(false);
      closeCurrentStream();
    });

    stream.onerror = () => {
      setIsConnecting(false);
      if (executionState !== 'idle') {
        setIsConnected(false);
      }
      closeCurrentStream();
    };

    return true;
  }, [sessionId, closeCurrentStream, executionState]);

  return {
    socket: null,
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
    executeTool: () => false,
    reconnect: () => {}
  };
};
