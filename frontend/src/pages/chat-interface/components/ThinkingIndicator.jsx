import React from 'react';
import { motion } from 'framer-motion';

/**
 * ThinkingIndicator - Animated pixel sprite with mode indicator
 * 
 * Displays:
 * - Pixel sprite animation
 * - Working status message
 * - Current mode (Chat/Agent/Code) with colored badge
 */
const ThinkingIndicator = ({ label = 'Working...', mode = 'chat' }) => {
  // Mode configuration
  const modeConfig = {
    chat: { label: 'Chat', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    agent: { label: 'Agent', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    code: { label: 'Code', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.2)' }
  };

  const currentMode = modeConfig[mode] || modeConfig.chat;

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-start max-w-[85%] md:max-w-2xl">
        <div
          className="px-4 py-3 rounded-2xl"
          style={{
            backgroundColor: '#2C2C2C',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center gap-3">
            {/* CSS Sprite Animation */}
            <div 
              className="thinking-sprite"
              aria-label="Thinking..."
            />
            <div className="flex flex-col gap-1">
              <motion.span
                className="text-sm text-white/70 font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {label}
              </motion.span>
              {/* Mode Badge */}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{
                  color: currentMode.color,
                  backgroundColor: currentMode.bgColor,
                  border: `1px solid ${currentMode.color}40`
                }}
              >
                {currentMode.label} Mode
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for sprite animation */}
      <style jsx>{`
        .thinking-sprite {
          width: 64px;
          height: 32px;
          background-image: url('/images/thinking-sprites.png');
          background-repeat: no-repeat;
          background-size: 300% 300%; /* 3x3 grid */
          animation: sprite-think 1.5s steps(1) infinite;
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        
        @keyframes sprite-think {
          /* Frame 1 - Top Left */
          0% { background-position: 0% 0%; }
          /* Frame 2 - Top Center */
          11.11% { background-position: 50% 0%; }
          /* Frame 3 - Top Right */
          22.22% { background-position: 100% 0%; }
          /* Frame 4 - Middle Left */
          33.33% { background-position: 0% 50%; }
          /* Frame 5 - Middle Center */
          44.44% { background-position: 50% 50%; }
          /* Frame 6 - Middle Right */
          55.55% { background-position: 100% 50%; }
          /* Frame 7 - Bottom Left */
          66.66% { background-position: 0% 100%; }
          /* Frame 8 - Bottom Center */
          77.77% { background-position: 50% 100%; }
          /* Frame 9 - Bottom Right */
          88.88% { background-position: 100% 100%; }
          /* Back to Frame 1 */
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </motion.div>
  );
};

export default ThinkingIndicator;
