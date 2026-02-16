import React from 'react';
import { motion } from 'framer-motion';

const ThinkingIndicator = () => (
  <motion.div
    className="flex items-center"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.2 }}
  >
    <div className="flex items-center gap-[5px] rounded-2xl bg-white/5 px-3 py-2 h-6 max-w-[72px]">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="inline-block h-[7px] w-[7px] rounded-full"
          style={{ backgroundColor: '#5ad0ff' }}
          animate={{ y: [0, -2, 0], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: dot * 0.1, ease: 'easeInOut' }}
        />
      ))}
    </div>
  </motion.div>
);

export default ThinkingIndicator;
