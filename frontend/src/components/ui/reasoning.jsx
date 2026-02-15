import React, { createContext, useContext, useEffect, useState, memo } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ReasoningContext = createContext(null);

const useReasoningContext = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export const Reasoning = memo(({ 
  children, 
  isStreaming = false, 
  defaultOpen = true,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (isStreaming) setIsOpen(true);
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming }}>
      <div className={`w-full space-y-2 my-2 ${className}`}>
        {children}
      </div>
    </ReasoningContext.Provider>
  );
});

export const ReasoningTrigger = memo(({ title = "OMO Reasoning" }) => {
  const { isOpen, setIsOpen, isStreaming } = useReasoningContext();

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2 text-muted-foreground text-xs font-mono transition-colors hover:text-accent group"
    >
      <Brain className={`w-3.5 h-3.5 ${isStreaming ? 'text-accent animate-pulse' : ''}`} />
      <span className="flex-1 text-left uppercase tracking-tighter">{title}</span>
      {isStreaming && (
        <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
      )}
      <ChevronDown
        className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
});

export const ReasoningContent = memo(({ children }) => {
  const { isOpen } = useReasoningContext();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 0.6 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden text-sm font-mono border-l border-white/10 pl-4 py-1"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
