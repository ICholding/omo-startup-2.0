import React from 'react';
import { motion } from 'framer-motion';
import { usePageTransition, zoomVariants } from '../config/animations';

const NotFound = () => {
  const pageVariants = usePageTransition(zoomVariants);
  
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground"
    >
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Page Not Found</p>
      <a 
        href="/" 
        className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
      >
        Go Home
      </a>
    </motion.div>
  );
};

export default NotFound;
