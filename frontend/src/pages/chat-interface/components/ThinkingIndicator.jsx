import React from 'react';
import { motion } from 'framer-motion';

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
            {/* Pixel Thinking Indicator */}
            <motion.img
              src="/images/thinking-indicator.png"
              alt="Thinking..."
              className="w-8 h-8 object-contain"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
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
    </motion.div>
  );
};

export default ThinkingIndicator;
