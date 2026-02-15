import { useState, useEffect } from 'react';
import { getConfiguredAgent, AGENT_MODES } from '../config/backend/agentConfig';

/**
 * HackerAI Agent Loader Hook
 * Loads the Cognitive Architect with strict six-part execution structure
 * 
 * NON-NEGOTIABLE: No multi-agent delegation. Direct execution only.
 */
export const useAgentLoader = () => {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [currentMode, setCurrentMode] = useState('recon');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAgent = async () => {
      try {
        setIsLoadingAgent(true);
        
        // Load HackerAI Cognitive Architect configuration
        const agentConfig = await getConfiguredAgent();
        
        // Initialize agent state with doctrine constraints
        const initializedAgent = {
          ...agentConfig,
          modes: AGENT_MODES,
          currentMode: agentConfig.activeMode,
          
          // Execution state machine
          executionState: 'idle', // idle | thinking | planning | executing | learning | adapting
          
          // Memory and context (collapse time through systems)
          memory: {
            findings: [],
            attackPaths: [],
            lessonsLearned: [],
            toolEffectiveness: {}
          },
          
          // Leverage metrics
          metrics: {
            tasksCompleted: 0,
            findingsDiscovered: 0,
            timeCollapsed: 0
          }
        };
        
        setCurrentAgent(initializedAgent);
        setCurrentMode(agentConfig.activeMode);
        setError(null);
        
        console.log('[HackerAI] Cognitive Architect initialized');
        console.log(`[HackerAI] Mode: ${agentConfig.activeMode}`);
        console.log(`[HackerAI] Model: ${agentConfig.cognition.model}`);
        
      } catch (err) {
        console.error('[HackerAI] Agent initialization failed:', err);
        setError(err.message);
        
        // Fallback to minimal cognitive architect
        setCurrentAgent({
          agentId: 'hackerai-fallback',
          agentName: 'HackerAI Cognitive Architect (Fallback)',
          activeMode: 'recon',
          modes: AGENT_MODES,
          error: err.message
        });
      } finally {
        setIsLoadingAgent(false);
      }
    };

    loadAgent();
  }, []);

  /**
   * Switch operational mode
   * @param {string} modeId - Target mode
   */
  const switchMode = async (modeId) => {
    if (!AGENT_MODES[modeId.toUpperCase()]) {
      console.error(`[HackerAI] Invalid mode: ${modeId}`);
      return false;
    }
    
    setCurrentMode(modeId);
    setCurrentAgent(prev => ({
      ...prev,
      activeMode: modeId,
      currentMode: modeId
    }));
    
    console.log(`[HackerAI] Mode switched to: ${modeId}`);
    return true;
  };

  /**
   * Execute task through THINK-PLAN-EXECUTE-LEARN cycle
   * @param {Object} task - Task definition
   */
  const executeTask = async (task) => {
    if (!currentAgent) {
      throw new Error('Agent not initialized');
    }

    setCurrentAgent(prev => ({
      ...prev,
      executionState: 'thinking'
    }));

    try {
      // API call to backend HackerAI orchestrator
      const response = await fetch('/api/hackerai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          mode: currentMode,
          agentId: currentAgent.agentId,
          cognition: currentAgent.cognition
        })
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update metrics
      setCurrentAgent(prev => ({
        ...prev,
        executionState: 'idle',
        metrics: {
          ...prev.metrics,
          tasksCompleted: prev.metrics.tasksCompleted + 1,
          findingsDiscovered: prev.metrics.findingsDiscovered + (result.findings?.length || 0)
        }
      }));

      return result;
      
    } catch (err) {
      setCurrentAgent(prev => ({
        ...prev,
        executionState: 'error'
      }));
      throw err;
    }
  };

  return {
    currentAgent,
    isLoadingAgent,
    currentMode,
    error,
    switchMode,
    executeTask,
    availableModes: Object.keys(AGENT_MODES),
    isReady: !isLoadingAgent && currentAgent !== null
  };
};

export default useAgentLoader;
