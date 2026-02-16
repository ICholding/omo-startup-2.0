import React from 'react';
import { FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatTimestamp, formatFileSize, handleFileDownload } from '../../../utils/fileHelpers';
import MarkdownMessage from '../../../components/ui/MarkdownMessage';
import { parseResponseContent } from '../../../utils/responseParser';

/**
 * Enhanced MessageBubble Component
 * Supports markdown rendering, syntax highlighting, and streaming state
 */
const MessageBubble = ({ message, showAvatar, isAgent, isStreaming = false, executionState = null }) => {
  const isUser = !isAgent;
  
  // Parse message content to clean HTTP artifacts
  const parsedContent = React.useMemo(() => {
    return parseResponseContent(message?.content);
  }, [message?.content]);
  
  // Get execution state label
  const getStateLabel = () => {
    switch (executionState) {
      case 'thinking':
        return 'THINKING';
      case 'planning':
        return 'PLANNING';
      case 'executing':
        return 'EXECUTING';
      case 'learning':
        return 'LEARNING';
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Message container */}
      <div className={`flex flex-col ${isUser ? 'items-end ml-auto max-w-[80%]' : 'items-start mr-auto max-w-[85%] sm:max-w-[80%]'}`}>
        {/* Execution state indicator */}
        {isAgent && executionState && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mb-1 px-2 py-1 rounded-full bg-[#1a1a1a] border border-gray-700"
          >
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              {getStateLabel()}
            </span>
          </motion.div>
        )}
        
        {/* Message bubble */}
        <div className={`message-bubble overflow-hidden ${isAgent ? 'message-bubble-agent' : 'message-bubble-user'}`}>
          {/* Markdown content for agent messages */}
          {isAgent && parsedContent ? (
            <div className="break-words overflow-wrap-anywhere">
              <MarkdownMessage 
                content={parsedContent} 
                isStreaming={isStreaming}
              />
            </div>
          ) : (
            /* Plain text for user messages */
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
              {parsedContent}
            </p>
          )}
          
          {/* Attachments */}
          {message?.attachments && message?.attachments?.length > 0 && (
            <div className={`${message?.content ? 'mt-3' : ''} space-y-2`}>
              {message?.attachments?.map((file) => (
                <div
                  key={file?.id}
                  className={`rounded-lg overflow-hidden ${
                    isAgent ? 'bg-muted' : 'bg-accent/10'
                  }`}
                >
                  {/* Image preview */}
                  {file?.preview && file?.type?.startsWith('image/') ? (
                    <div className="relative group">
                      <img
                        src={file?.preview}
                        alt={file?.name}
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(file?.preview, '_blank')}
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate">{file?.name}</p>
                      </div>
                    </div>
                  ) : (
                    /* File attachment */
                    (<div className="flex items-center gap-3 p-3">
                      <div className={`w-10 h-10 rounded flex items-center justify-center ${
                        isAgent ? 'bg-muted' : 'bg-accent/20'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          isAgent ? 'text-muted-foreground' : 'text-accent'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file?.size)}</p>
                      </div>
                      <button
                        onClick={() => handleFileDownload(file)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isAgent 
                            ? 'hover:bg-muted text-muted-foreground' : 'hover:bg-accent/20 text-accent'
                        }`}
                        aria-label="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>)
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <p className="message-timestamp mt-1">{formatTimestamp(message?.timestamp)}</p>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
