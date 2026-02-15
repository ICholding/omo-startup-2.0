import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'date-fns';
import { Terminal, Shield, AlertTriangle, CheckCircle, Cpu, Lock } from 'lucide-react';

/**
 * Enhanced Message Bubble with Markdown and Syntax Highlighting
 * Renders rich text, code blocks, and terminal output
 */
const EnhancedMessageBubble = ({ message, showAvatar = true, isAgent = false }) => {
  const { content, timestamp, executionState, findings, error } = message;

  // Get icon based on message type
  const getMessageIcon = () => {
    if (error) return <AlertTriangle className="w-5 h-5 text-red-400" />;
    if (executionState === 'EXECUTING') return <Cpu className="w-5 h-5 text-blue-400 animate-pulse" />;
    if (executionState === 'LEARNING') return <Shield className="w-5 h-5 text-green-400" />;
    if (findings && findings.length > 0) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (isAgent) return <Terminal className="w-5 h-5 text-accent" />;
    return <Lock className="w-5 h-5 text-muted-foreground" />;
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    // Code blocks with syntax highlighting
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      
      if (!inline && match) {
        return (
          <div className="my-3 rounded-lg overflow-hidden border border-white/10">
            <div className="bg-[#1e1e1e] px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
              <span className="font-mono">{language}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                className="hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              className="!m-0 !rounded-none"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      return (
        <code 
          className="bg-black/30 px-1.5 py-0.5 rounded text-sm font-mono text-accent border border-white/5" 
          {...props}
        >
          {children}
        </code>
      );
    },
    
    // Headers
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-medium text-white/90 mt-2 mb-1">{children}</h3>
    ),
    
    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-2 space-y-1 text-gray-300">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-2 space-y-1 text-gray-300">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-300">{children}</li>
    ),
    
    // Paragraphs and text
    p: ({ children }) => (
      <p className="text-gray-300 leading-relaxed mb-2">{children}</p>
    ),
    
    // Links
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-accent hover:text-accent/80 underline"
      >
        {children}
      </a>
    ),
    
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-accent/50 pl-4 my-3 italic text-gray-400 bg-black/20 py-2 pr-4 rounded-r">
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: () => <hr className="border-white/10 my-4" />,
    
    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm text-left text-gray-300 border border-white/10 rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-white/5 text-white font-semibold">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-white/5">{children}</tr>,
    th: ({ children }) => <th className="px-4 py-2">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2">{children}</td>,
    
    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="text-white font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="text-gray-400 italic">{children}</em>
    )
  };

  return (
    <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isAgent 
            ? 'bg-accent/20 border border-accent/30' 
            : 'bg-white/10 border border-white/20'
        }`}>
          {getMessageIcon()}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] ${isAgent ? '' : 'text-right'}`}>
        {/* Bubble */}
        <div 
          className={`inline-block px-4 py-3 rounded-2xl text-left ${
            isAgent
              ? 'bg-[#2a2a2a] border border-white/10 text-white'
              : 'bg-accent text-accent-foreground'
          } ${error ? 'border-red-500/50 bg-red-500/10' : ''}`}
        >
          {isAgent ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm">{content}</p>
          )}

          {/* Execution State Badge */}
          {executionState && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                executionState === 'EXECUTING' 
                  ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                  : executionState === 'LEARNING'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {executionState}
              </span>
              {findings && findings.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {findings.length} findings
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <p className={`text-xs text-muted-foreground mt-1 ${isAgent ? '' : 'text-right'}`}>
            {format(new Date(timestamp), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
