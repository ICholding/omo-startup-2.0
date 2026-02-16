import React from 'react';
import { motion } from 'framer-motion';

const STATE_LABELS = {
  thinking: 'Analyzing',
  working: 'Working',
  executing: 'Executing',
  fetching: 'Fetching',
  processing: 'Processing'
};

const STATE_TINT = {
  thinking: '#1DA9FF',
  working: '#21B7FF',
  executing: '#2FCBFF',
  fetching: '#42D7FF',
  processing: '#55E2FF'
};

/**
 * Native glowing "thinking" indicator synced to backend SSE states.
 */
const ThinkingIndicator = ({ label = 'Working...', state = 'thinking' }) => {
  const normalizedState = STATE_LABELS[state] ? state : 'thinking';
  const stateLabel = STATE_LABELS[normalizedState];
  const glowColor = STATE_TINT[normalizedState];

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col items-start max-w-[85%] md:max-w-2xl">
        <div
          className="relative rounded-[999px] px-6 py-3 min-w-[220px]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(32, 133, 255, 0.35) 0%, rgba(19, 41, 85, 0.8) 48%, rgba(11, 22, 48, 0.98) 100%)',
            border: '1px solid rgba(149, 193, 255, 0.25)',
            boxShadow:
              'inset 0 1px 16px rgba(113, 168, 255, 0.22), inset 0 -8px 24px rgba(2, 11, 31, 0.8), 0 10px 24px rgba(7, 26, 67, 0.45)'
          }}
        >
          <div className="absolute inset-[2px] rounded-[999px] border border-white/10 pointer-events-none" />

          <div className="relative flex items-center justify-center gap-4">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="w-5 h-5 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 25%, #72EEFF 0%, ${glowColor} 55%, #0896F0 100%)`,
                  boxShadow: `0 0 16px ${glowColor}, 0 0 32px rgba(22, 172, 255, 0.45)`
                }}
                animate={{
                  scale: [0.92, 1.06, 0.92],
                  opacity: [0.7, 1, 0.72],
                  y: [1, -1, 1]
                }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: dot * 0.14,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 px-1 text-xs text-white/70">
          <span className="font-medium text-white/85">{stateLabel}:</span> {label}
        </div>
      </div>
    </motion.div>
  );
};

export default ThinkingIndicator;
