import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiUrl } from '../config/api';

/**
 * useSocket Hook - SSE-based streaming for OMO Assistant
 * 
 * Provides pixel thinking indicator with "Working..." status updates
 */
export const useSocket = (sessionId) => {
  const streamRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [executionState, setExecutionState] = useState('idle');
  const [suggestion, setSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [thinkingMessage, setThinkingMessage] = useState('Working...');
  const [executionPackage, setExecutionPackage] = useState(null);

  const resetStreamingState = () => {
    setStreamedResponse('');
    setThinkingMessage('Working...');
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
      const state = data?.state || 'thinking';
      setExecutionState(state);
      
      // Dynamic thinking messages based on state
      switch (state) {
        case 'thinking':
          setThinkingMessage('Working... analyzing your request');
          break;
        case 'working':
          setThinkingMessage('Working... executing task');
          break;
        case 'executing':
          setThinkingMessage('Working... running commands');
          break;
        case 'fetching':
          setThinkingMessage('Working... fetching data');
          break;
        case 'processing':
          setThinkingMessage('Working... processing results');
          break;
        default:
          setThinkingMessage(data?.message || 'Working...');
      }
    });

    stream.addEventListener('response', (event) => {
      const data = JSON.parse(event.data || '{}');
      if (data?.message) {
        setStreamedResponse(prev => prev + data.message);
      }
    });

    stream.addEventListener('execution-complete', (event) => {
      const data = JSON.parse(event.data || '{}');
      setExecutionPackage(data);
      
      const finalResponse = data?.summary || streamedResponse || 'Task completed.';
      setStreamedResponse(finalResponse);
      
      const nextSuggestions = Array.isArray(data?.nextActions) 
        ? data.nextActions.slice(0, 3) 
        : [];
      setSuggestions(nextSuggestions);
      setSuggestion(nextSuggestions[0] || null);
      setExecutionState('idle');
      setIsStreaming(false);
    });

    stream.addEventListener('execution-error', (event) => {
      const data = JSON.parse(event.data || '{}');
      setExecutionState('error');
      setStreamedResponse(data?.error || 'Failed to process request.');
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
  }, [sessionId, closeCurrentStream, executionState, streamedResponse]);

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

export default useSocket;
