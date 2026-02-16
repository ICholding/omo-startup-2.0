import React from 'react';
import { motion } from 'framer-motion';

/**
 * ThinkingIndicator - Animated pixel sprite using CSS sprite sheet
 * 
 * Uses a 3x3 grid sprite sheet (9 frames) for smooth pixel animation
 * Frame sequence: 0,1,2,3,4,5,6,7,8,7,6,5,4,3,2,1 (forward then reverse)
 */
const ThinkingIndicator = ({ label = 'Working...' }) => {
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
            <motion.span
              className="text-sm text-white/70 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {label}
            </motion.span>
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
