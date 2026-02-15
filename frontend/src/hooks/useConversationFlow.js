import { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';

/**
 * HackerAI Conversation Flow Hook
 * Routes all messages to the Cognitive Architect backend
 * NO local canned responses - ALL execution through THINK-PLAN-EXECUTE-LEARN
 */
export const useConversationFlow = (currentAgent, messages, isPaused) => {
  const [currentStep, setCurrentStep] = useState('initial');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intakeData, setIntakeData] = useState({});
  const [pendingResponse, setPendingResponse] = useState(null);
  const [executionState, setExecutionState] = useState('idle'); // idle | thinking | executing | responding

  useEffect(() => {
    if (!isPaused && pendingResponse) {
      const agentMessage = {
        id: messages?.length + 1,
        sender: 'agent',
        content: pendingResponse?.question,
        timestamp: new Date()
      };

      return { type: 'ADD_MESSAGE', payload: agentMessage, nextStep: pendingResponse?.nextStep };
    }
  }, [isPaused, pendingResponse, messages?.length]);

  /**
   * Call HackerAI Backend API
   * THINK-PLAN-EXECUTE-LEARN cycle
   */
  const callHackerAI = async (messageContent) => {
    try {
      setExecutionState('thinking');
      
      const response = await fetch(getApiUrl('/api/hackerai/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            description: messageContent,
            target: 'conversation',
            context: messages.slice(-5) // Last 5 messages for context
          },
          mode: currentAgent?.activeMode || 'learn',
          options: {
            thinkingDepth: 'deep',
            leverageOptimization: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setExecutionState('responding');
      
      return {
        content: result.response || result.findings?.map(f => f.data).join('\n') || 'Task executed successfully.',
        executionState: result.executionState,
        taskId: result.taskId,
        findings: result.findings
      };
      
    } catch (error) {
      console.error('[HackerAI] API call failed:', error);
      setExecutionState('error');
      
      // Fallback to legacy endpoint if HackerAI not available
      try {
        const legacyResponse = await fetch(getApiUrl('/api/chat/message'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            agentId: currentAgent?.agentId || 'hackerai-cognitive-architect',
            context: messages.slice(-5)
          })
        });
        
        if (legacyResponse.ok) {
          const data = await legacyResponse.json();
          return { content: data.response };
        }
      } catch (legacyError) {
        console.error('[Legacy] API call failed:', legacyError);
      }
      
      return {
        content: `⚠️ **System Notice**: HackerAI Cognitive Architect is initializing.\n\nYour message: "${messageContent}"\n\nStatus: Backend connection pending. Please ensure the HackerAI agent-core is running on the backend.`,
        error: true
      };
    }
  };

  /**
   * Process message through HackerAI
   * NO local canned responses - DIRECT EXECUTION ONLY
   */
  const processMessage = async (messageContent, messagesLength) => {
    setIsProcessing(true);
    setExecutionState('thinking');

    try {
      // Call HackerAI backend
      const result = await callHackerAI(messageContent);
      
      const agentMessage = {
        id: messagesLength + 2,
        sender: 'agent',
        content: result.content,
        timestamp: new Date(),
        isNew: true,
        executionState: result.executionState,
        taskId: result.taskId,
        findings: result.findings,
        error: result.error
      };

      setExecutionState('idle');
      setIsProcessing(false);
      return agentMessage;
      
    } catch (error) {
      console.error('[ConversationFlow] Processing failed:', error);
      
      const errorMessage = {
        id: messagesLength + 2,
        sender: 'agent',
        content: `**Execution Error**: ${error.message}\n\nPlease verify the HackerAI backend is running and accessible.`,
        timestamp: new Date(),
        isNew: true,
        error: true
      };

      setExecutionState('error');
      setIsProcessing(false);
      return errorMessage;
    }
  };

  const resetPendingResponse = () => {
    setPendingResponse(null);
    setIsProcessing(false);
    setExecutionState('idle');
  };

  const updateStep = (step) => {
    setCurrentStep(step);
  };

  return {
    currentStep,
    isProcessing,
    executionState,
    intakeData,
    pendingResponse,
    processMessage,
    resetPendingResponse,
    updateStep
  };
};
