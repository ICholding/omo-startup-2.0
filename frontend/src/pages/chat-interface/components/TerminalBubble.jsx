import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Play, Square, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Terminal Bubble Component
 * Displays live tool execution output with terminal styling
 */
const TerminalBubble = ({ toolName, output = [], isRunning = false, onStop, executionTime }) => {
  const terminalRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current && isExpanded) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, isExpanded]);

  // Copy output to clipboard
  const handleCopy = () => {
    const text = output.map(line => line.line).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format line content with ANSI color support (basic)
  const formatLine = (line, type) => {
    const baseClasses = 'font-mono text-sm whitespace-pre-wrap break-all';
    
    switch (type) {
      case 'stderr':
        return <span className={`${baseClasses} text-red-400`}>{line}</span>;
      case 'error':
        return <span className={`${baseClasses} text-red-400 font-semibold`}>{line}</span>;
      case 'success':
        return <span className={`${baseClasses} text-green-400`}>{line}</span>;
      case 'info':
        return <span className={`${baseClasses} text-blue-400`}>{line}</span>;
      case 'warning':
        return <span className={`${baseClasses} text-yellow-400`}>{line}</span>;
      default:
        return <span className={`${baseClasses} text-gray-300`}>{line}</span>;
    }
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0d1117]">
      {/* Terminal Header */}
      <div className="bg-[#161b22] px-4 py-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">{toolName || 'Terminal'}</span>
          </div>
          
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400">Running</span>
            </span>
          )}
          
          {!isRunning && executionTime && (
            <span className="text-xs text-gray-500">
              Completed in {executionTime}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stop Button (when running) */}
          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="Stop execution"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Copy output"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-xs font-mono">{isExpanded ? '▼' : '▶'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      {isExpanded && (
        <div
          ref={terminalRef}
          className="p-4 font-mono text-sm max-h-96 overflow-y-auto bg-[#0d1117]"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent'
          }}
        >
          {output.length === 0 ? (
            <div className="text-gray-500 italic">
              {isRunning ? 'Initializing...' : 'No output'}
            </div>
          ) : (
            <div className="space-y-0.5">
              {output.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-gray-600 select-none w-12 text-right flex-shrink-0">
                    {index + 1}
                  </span>
                  {formatLine(item.line, item.type)}
                </div>
              ))}
              
              {/* Blinking cursor when running */}
              {isRunning && (
                <div className="flex gap-2">
                  <span className="text-gray-600 select-none w-12 text-right">
                    {output.length + 1}
                  </span>
                  <span className="w-2 h-5 bg-accent animate-pulse" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-[#161b22] px-4 py-1.5 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
        <span>{output.length} lines</span>
        <span>{format(new Date(), 'HH:mm:ss')}</span>
      </div>
    </div>
  );
};

/**
 * Thinking State Indicator
 * Shows the agent's current cognitive state
 */
export const ThinkingIndicator = ({ state, message }) => {
  const getStateColor = () => {
    switch (state) {
      case 'THINKING': return 'text-blue-400';
      case 'PLANNING': return 'text-yellow-400';
      case 'EXECUTING': return 'text-green-400';
      case 'LEARNING': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-3 my-4 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${getStateColor()} animate-pulse`} />
        <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStateColor()} animate-ping opacity-50`} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${getStateColor()}`}>
            {state || 'PROCESSING'}
          </span>
          <span className="text-xs text-gray-500">
            {message || 'Working...'}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getStateColor().replace('text-', 'bg-')} animate-[loading_2s_ease-in-out_infinite]`}
            style={{ width: '30%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TerminalBubble;
