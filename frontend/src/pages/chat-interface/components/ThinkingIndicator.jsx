import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const STATE_PRESETS = {
  thinking: {
    glow: '0 0 18px rgba(30, 170, 255, 0.55), 0 0 36px rgba(30, 170, 255, 0.25)',
    sparkColor: 'rgba(42, 186, 255, 0.85)',
    shellGradient: 'radial-gradient(circle at 25% 20%, #3f5f93 0%, #1b315a 45%, #122444 100%)'
  },
  executing: {
    glow: '0 0 18px rgba(44, 205, 255, 0.7), 0 0 36px rgba(44, 205, 255, 0.35)',
    sparkColor: 'rgba(88, 222, 255, 0.92)',
    shellGradient: 'radial-gradient(circle at 30% 20%, #3f6898 0%, #1e3d6e 45%, #143058 100%)'
  },
  working: {
    glow: '0 0 18px rgba(38, 193, 255, 0.7), 0 0 40px rgba(38, 193, 255, 0.35)',
    sparkColor: 'rgba(70, 220, 255, 0.9)',
    shellGradient: 'radial-gradient(circle at 32% 22%, #3b6594 0%, #1d3868 45%, #142c52 100%)'
  },
  processing: {
    glow: '0 0 18px rgba(56, 197, 255, 0.68), 0 0 36px rgba(56, 197, 255, 0.34)',
    sparkColor: 'rgba(104, 225, 255, 0.94)',
    shellGradient: 'radial-gradient(circle at 28% 20%, #406591 0%, #213a66 46%, #152d4f 100%)'
  },
  fetching: {
    glow: '0 0 18px rgba(34, 180, 255, 0.72), 0 0 36px rgba(34, 180, 255, 0.35)',
    sparkColor: 'rgba(90, 208, 255, 0.92)',
    shellGradient: 'radial-gradient(circle at 28% 18%, #3a608e 0%, #1e3764 45%, #142a4c 100%)'
  },
  idle: {
    glow: '0 0 12px rgba(30, 160, 255, 0.35)',
    sparkColor: 'rgba(89, 168, 255, 0.65)',
    shellGradient: 'radial-gradient(circle at 30% 20%, #34527f 0%, #1a2f55 46%, #10203e 100%)'
  }
};

const ThinkingIndicator = ({ label = 'Working...', state = 'thinking' }) => {
  const normalizedState = (state || 'thinking').toLowerCase();
  const preset = useMemo(() => STATE_PRESETS[normalizedState] || STATE_PRESETS.thinking, [normalizedState]);

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      aria-live="polite"
      aria-label={`Assistant status: ${label}`}
    >
      <div className="max-w-[85%] md:max-w-2xl">
        <div
          className="native-thinking-shell relative overflow-hidden rounded-[40px] border px-5 py-3"
          style={{
            borderColor: 'rgba(123, 170, 255, 0.28)',
            background: preset.shellGradient,
            boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.07), inset 0 -12px 20px rgba(4, 10, 27, 0.55), ${preset.glow}`
          }}
        >
          <div className="native-thinking-core flex items-center gap-2.5">
            {[0, 1, 2].map((dotIndex) => (
              <motion.span
                key={dotIndex}
                className="native-thinking-dot"
                style={{ boxShadow: preset.glow, backgroundColor: '#2fc3ff' }}
                animate={{
                  y: [0, -2.5, 0],
                  opacity: [0.55, 1, 0.55],
                  scale: [0.95, 1.08, 0.95]
                }}
                transition={{
                  duration: 0.95,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: dotIndex * 0.16
                }}
              />
            ))}

            <motion.span
              className="ml-2 text-xs font-medium tracking-wide text-cyan-50/80"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {label}
            </motion.span>
          </div>

          <div className="native-thinking-sparks" style={{ '--spark-color': preset.sparkColor }} aria-hidden="true" />
        </div>
      </div>

      <style>{`
        .native-thinking-shell {
          min-width: 210px;
          backdrop-filter: blur(1px);
        }

        .native-thinking-core {
          position: relative;
          z-index: 2;
        }

        .native-thinking-dot {
          width: 17px;
          height: 17px;
          border-radius: 9999px;
        }

        .native-thinking-sparks {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.65;
          background-image:
            radial-gradient(circle at 19% 52%, var(--spark-color) 0 1.4px, transparent 2px),
            radial-gradient(circle at 29% 43%, var(--spark-color) 0 1.7px, transparent 2.1px),
            radial-gradient(circle at 42% 58%, var(--spark-color) 0 1.5px, transparent 2.1px),
            radial-gradient(circle at 56% 44%, var(--spark-color) 0 1.5px, transparent 2px),
            radial-gradient(circle at 69% 57%, var(--spark-color) 0 1.6px, transparent 2px),
            radial-gradient(circle at 82% 48%, var(--spark-color) 0 1.4px, transparent 2px);
          animation: spark-flow 1.5s ease-in-out infinite;
          filter: blur(0.12px);
        }

        @keyframes spark-flow {
          0% {
            transform: translateX(-2%) scale(0.98);
            opacity: 0.38;
          }
          50% {
            transform: translateX(2%) scale(1.02);
            opacity: 0.9;
          }
          100% {
            transform: translateX(-2%) scale(0.98);
            opacity: 0.38;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ThinkingIndicator;
