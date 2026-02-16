import React from 'react';
import { motion } from 'framer-motion';

const ThinkingIndicator = () => (
  <motion.div
    className="flex items-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    <div className="flex items-center gap-[2px] px-1 py-1">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="inline-block w-[3px] h-[3px]"
          style={{ 
            backgroundColor: '#5ad0ff',
            imageRendering: 'pixelated',
            boxShadow: '0 0 1px rgba(90, 208, 255, 0.3)'
          }}
          animate={{ 
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity, 
            delay: dot * 0.15, 
            ease: 'easeInOut' 
          }}
        />
      ))}
    </div>
  </motion.div>
);

export default ThinkingIndicator;
