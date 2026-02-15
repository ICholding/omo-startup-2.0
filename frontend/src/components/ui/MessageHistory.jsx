import React, { useEffect, useRef } from 'react';
import Image from '../AppImage';

const MessageHistory = ({ messages }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date?.toDateString() === now?.toDateString();
    
    const timeString = date?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return timeString;
    }

    return `${date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeString}`;
  };

  return (
    <div className="flex-1 overflow-y-auto smooth-scroll" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div className="message-container">
        {messages?.map((message, index) => {
          const isAgent = message?.sender === 'agent';
          const showAvatar = isAgent && (index === 0 || messages?.[index - 1]?.sender !== 'agent');

          return (
            <div key={message?.id} className="message-group">
              <div className={`flex items-start gap-3 ${!isAgent ? 'flex-row-reverse' : ''}`}>
                {showAvatar && isAgent && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-elevation-sm">
                    <Image
                      src="/assets/images/agent-axel-avatar.png"
                      alt="Agent Axel avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!showAvatar && isAgent && <div className="w-10 flex-shrink-0" />}
                
                <div className={`flex flex-col ${!isAgent ? 'items-end' : 'items-start'}`}>
                  <div className={`message-bubble ${isAgent ? 'message-bubble-agent' : 'message-bubble-user'}`}>
                    <p className="text-base leading-relaxed">{message?.content}</p>
                  </div>
                  <p className="message-timestamp">{formatTimestamp(message?.timestamp)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageHistory;