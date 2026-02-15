import { useReducedMotion } from 'framer-motion';

// Page transition variants - Fade with subtle vertical movement
export const fadeVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Slide from right (for forward navigation)
export const slideRightVariants = {
  initial: {
    opacity: 0,
    x: 100
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Slide from left (for backward navigation)
export const slideLeftVariants = {
  initial: {
    opacity: 0,
    x: -100
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Zoom/Scale effect
export const zoomVariants = {
  initial: {
    opacity: 0,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Scale with rotation (for special pages)
export const scaleRotateVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    rotate: -5
  },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    rotate: 5,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// No animation (for accessibility - reduced motion)
export const noMotionVariants = {
  initial: {
    opacity: 1
  },
  animate: {
    opacity: 1
  },
  exit: {
    opacity: 1
  }
};

/**
 * Hook to get appropriate animation variants based on user's motion preferences
 * @param {Object} variants - The animation variants to use (default: fadeVariants)
 * @returns {Object} - Animation variants (original or no-motion based on preference)
 */
export const usePageTransition = (variants = fadeVariants) => {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ? noMotionVariants : variants;
};

/**
 * Animation configuration constants
 */
export const animationConfig = {
  // Default duration for page transitions
  defaultDuration: 0.3,
  
  // Default easing function (ease-out-cubic)
  defaultEasing: [0.4, 0, 0.2, 1],
  
  // AnimatePresence mode
  presenceMode: 'wait', // Wait for exit animation before entering
  
  // Reduced motion detection
  respectReducedMotion: true
};

export default {
  fadeVariants,
  slideRightVariants,
  slideLeftVariants,
  zoomVariants,
  scaleRotateVariants,
  noMotionVariants,
  usePageTransition,
  animationConfig
};