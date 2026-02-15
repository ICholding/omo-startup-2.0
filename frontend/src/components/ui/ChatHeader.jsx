import React from 'react';
import { Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const ChatHeader = ({ onMenuClick, sessionTitle }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-12 bg-card/95 backdrop-blur border-b border-border shadow-elevation-sm">
      <div className="mx-auto relative flex h-full max-w-5xl items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="h-10 w-10 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>

        <p className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-foreground truncate max-w-[55%] text-center">
          {sessionTitle || ''}
        </p>

        <ThemeToggle />
      </div>
    </header>
  );
};

export default ChatHeader;
