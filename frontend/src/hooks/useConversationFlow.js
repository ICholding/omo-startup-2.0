import { useState } from 'react';
import { getApiUrl } from '../config/api';

export const useConversationFlow = (currentAgent, messages) => {
  const [currentStep, setCurrentStep] = useState('initial');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intakeData] = useState({});
  const [pendingResponse, setPendingResponse] = useState(null);
  const [executionState, setExecutionState] = useState('idle');

  const processMessage = async (messageContent, messagesLength) => {
    setIsProcessing(true);
    setExecutionState('thinking');

    try {
      const response = await fetch(getApiUrl('/api/chat/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId: currentAgent?.agentId || 'omo-session',
          context: messages.slice(-5)
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setExecutionState('idle');
      setIsProcessing(false);

      return {
        id: messagesLength + 2,
        sender: 'agent',
        content: result.summary || result.response || 'Task executed successfully.',
        timestamp: new Date(),
        isNew: true,
        executionState: 'idle',
        error: false
      };
    } catch (error) {
      setExecutionState('error');
      setIsProcessing(false);
      return {
        id: messagesLength + 2,
        sender: 'agent',
        content: `**Execution Error**: ${error.message}`,
        timestamp: new Date(),
        isNew: true,
        error: true
      };
    }
  };

  return {
    currentStep,
    isProcessing,
    executionState,
    intakeData,
    pendingResponse,
    processMessage,
    resetPendingResponse: () => setPendingResponse(null),
    updateStep: setCurrentStep
  };
};
