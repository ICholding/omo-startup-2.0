import React from 'react';

const ChatFooter = () => {
  const currentYear = new Date()?.getFullYear();

  return (
    <footer className="h-12 flex items-center justify-center bg-card border-t border-border px-4">
      <p className="text-xs text-muted-foreground">Powered by OmoAi &copy; {currentYear}</p>
    </footer>
  );
};

export default ChatFooter;