import { useState, useEffect } from 'react';

export const useMessageHandler = (currentAgent, isLoadingAgent, conversationFlow) => {
  const [messages, setMessages] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused && conversationFlow?.pendingResponse) {
      const agentMessage = {
        id: messages?.length + 1,
        sender: 'agent',
        content: conversationFlow?.pendingResponse?.question,
        timestamp: new Date(),
        isNew: true
      };

      setMessages(prev => [...prev, agentMessage]);
      conversationFlow?.updateStep(conversationFlow?.pendingResponse?.nextStep);
      conversationFlow?.resetPendingResponse();
    }
  }, [isPaused, conversationFlow?.pendingResponse]);

  const handleSendMessage = async (messageContent, attachments = []) => {
    if (conversationFlow?.isProcessing) return;

    const userMessage = {
      id: messages?.length + 1,
      sender: 'user',
      content: messageContent,
      attachments: attachments?.length > 0 ? attachments : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    const agentResponse = await conversationFlow?.processMessage(messageContent, messages?.length);
    
    if (agentResponse) {
      const agentMessageWithFlag = {
        ...agentResponse,
        isNew: true
      };
      setMessages(prev => [...prev, agentMessageWithFlag]);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
  };

  return {
    messages,
    isPaused,
    handleSendMessage,
    handleTogglePause
  };
};
