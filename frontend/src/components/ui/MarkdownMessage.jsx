import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownMessage Component
 * Renders markdown with syntax highlighting for code blocks
 */
const MarkdownMessage = ({ content, isStreaming = false }) => {
  // Custom components for markdown rendering
  const components = {
    // Code blocks with syntax highlighting
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      
      if (!inline && match) {
        return (
          <div className="relative group my-3">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] rounded-t-lg border-b border-[#333]">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                className="text-xs text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              className="rounded-b-lg !m-0 !rounded-t-none"
              showLineNumbers={true}
              lineNumberStyle={{ color: '#555', minWidth: '2.5em' }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // Inline code
      return (
        <code
          className="px-1.5 py-0.5 bg-[#2d2d2d] text-[#e6e6e6] rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    
    // Headers
    h1({ children }) {
      return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-base font-semibold text-gray-200 mt-3 mb-1">{children}</h3>;
    },
    
    // Paragraphs
    p({ children }) {
      return <p className="text-gray-300 leading-relaxed mb-2">{children}</p>;
    },
    
    // Lists
    ul({ children }) {
      return <ul className="list-disc list-inside text-gray-300 space-y-1 mb-3 ml-2">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside text-gray-300 space-y-1 mb-3 ml-2">{children}</ol>;
    },
    li({ children }) {
      return <li className="text-gray-300">{children}</li>;
    },
    
    // Strong and emphasis
    strong({ children }) {
      return <strong className="text-white font-semibold">{children}</strong>;
    },
    em({ children }) {
      return <em className="text-gray-300 italic">{children}</em>;
    },
    
    // Blockquotes
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-green-500 pl-4 my-3 text-gray-400 italic bg-[#1a1a1a] py-2 pr-3 rounded-r">
          {children}
        </blockquote>
      );
    },
    
    // Links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300 underline transition-colors"
        >
          {children}
        </a>
      );
    },
    
    // Horizontal rule
    hr() {
      return <hr className="border-gray-700 my-4" />;
    },
    
    // Tables
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-gray-700 text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-[#2d2d2d]">{children}</thead>;
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }) {
      return <tr className="border-b border-gray-700">{children}</tr>;
    },
    th({ children }) {
      return <th className="px-4 py-2 text-left text-gray-300 font-semibold border-r border-gray-700 last:border-r-0">{children}</th>;
    },
    td({ children }) {
      return <td className="px-4 py-2 text-gray-400 border-r border-gray-700 last:border-r-0">{children}</td>;
    }
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
      
      {/* Streaming cursor effect */}
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-green-500 ml-1 animate-pulse" />
      )}
    </div>
  );
};

export default MarkdownMessage;
