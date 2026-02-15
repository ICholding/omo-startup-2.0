/**
 * OMO Cognitive Architect Configuration
 * 
 * NON-NEGOTIABLE AI CONTROL DOCTRINE
 * Purpose: Reprogram cognition, engineer asymmetric outcomes, collapse time through systems
 * Value = Solved problems and installed systems only
 * 
 * Structure: Strict six-part execution cycle
 * 1. THINK - Strategic assessment and attack vector identification
 * 2. PLAN - Execution strategy with clear constraints
 * 3. EXECUTE - Tool deployment with leverage optimization
 * 4. LEARN - Knowledge extraction and pattern recognition
 * 5. ADAPT - Real-time replanning based on findings
 * 6. SECURE - Remediation and hardening
 */

import { getBrandConfig } from '../brandConfig';

/**
 * OMO Agent Modes
 * Test - Hack - Learn - Secure
 */
export const AGENT_MODES = {
  RECON: {
    id: 'recon',
    name: 'Reconnaissance',
    description: 'Information gathering and attack surface mapping',
    tools: ['dns_enum', 'subdomain_scan', 'whois_lookup', 'osint_gather']
  },
  SCAN: {
    id: 'scan',
    name: 'Scanning',
    description: 'Active vulnerability and service discovery',
    tools: ['port_scan', 'service_enum', 'vuln_scan', 'web_scan']
  },
  EXPLOIT: {
    id: 'exploit',
    name: 'Exploitation',
    description: 'Proof-of-concept security testing',
    tools: ['sql_inject', 'xss_test', 'auth_bypass', 'payload_gen']
  },
  POST_EXPLOIT: {
    id: 'post_exploit',
    name: 'Post-Exploitation',
    description: 'Lateral movement and privilege escalation',
    tools: ['privesc_check', 'lateral_movement', 'persistence_check']
  },
  LEARN: {
    id: 'learn',
    name: 'Analysis',
    description: 'Intelligence extraction and risk assessment',
    tools: ['findings_analysis', 'pattern_recognition', 'risk_scoring']
  },
  SECURE: {
    id: 'secure',
    name: 'Hardening',
    description: 'Remediation and security implementation',
    tools: ['remediation_plan', 'config_hardening', 'monitoring_setup']
  }
};

/**
 * Core Configuration - Single OMO Agent
 * No multi-agent delegation. No dilution. Direct execution.
 */
const HACKERAI_CONFIG = {
  activeMode: 'recon', // Default operational mode
  agentId: 'omo-cognitive-architect',
  agentName: 'OMO Cognitive Architect',
  version: '1.0.0',
  
  // Cognitive Architecture
  cognition: {
    model: 'claude-4-opus',
    maxTokens: 4096,
    temperature: 0.3,
    thinkingDepth: 'deep', // surface | moderate | deep
    leverageOptimization: true
  },
  
  // Execution Constraints
  constraints: {
    maxTaskDuration: 3600, // seconds
    maxConcurrentTasks: 5,
    autoReplanning: true,
    riskThreshold: 'medium', // low | medium | high | critical
    authorizedTargetsOnly: true
  },
  
  // Tool Registry Access
  tools: {
    reconnaissance: ['dns_enum', 'subdomain_scan', 'whois_lookup', 'osint_gather', 'metadata_extract'],
    scanning: ['port_scan', 'service_enum', 'vuln_scan', 'web_scan'],
    exploitation: ['sql_inject', 'xss_test', 'auth_bypass', 'traversal_test'],
    postExploitation: ['shell_stabilize', 'privesc_check', 'data_exfil', 'lateral_movement'],
    analysis: ['findings_correlation', 'risk_scoring', 'report_generation']
  },
  
  // Output Control
  output: {
    format: 'structured', // raw | structured | executive
    includeEvidence: true,
    includeRemediation: true,
    realTimeUpdates: true
  }
};

/**
 * Get OMO Agent Configuration
 * Loads from backend API, falls back to cognitive doctrine defaults
 * @returns {Promise<Object>} OMO agent configuration
 */
export const getConfiguredAgent = async () => {
  try {
    const brandConfig = await getBrandConfig();
    return {
      ...HACKERAI_CONFIG,
      activeMode: brandConfig?.activeMode || HACKERAI_CONFIG.activeMode,
      clientName: brandConfig?.clientName || 'OMO Security Assessment',
      industry: brandConfig?.industry || 'Cybersecurity'
    };
  } catch (error) {
    console.warn('Backend unavailable, using OMO cognitive defaults:', error);
    return HACKERAI_CONFIG;
  }
};

/**
 * Get configuration synchronously
 * @returns {Object} OMO configuration
 */
export const getConfiguredAgentSync = () => HACKERAI_CONFIG;

/**
 * Get current operational mode
 * @returns {Object} Current mode configuration
 */
export const getCurrentMode = () => {
  return AGENT_MODES[HACKERAI_CONFIG.activeMode.toUpperCase()] || AGENT_MODES.RECON;
};

/**
 * Switch operational mode
 * @param {string} modeId - Mode to activate
 */
export const setAgentMode = (modeId) => {
  if (AGENT_MODES[modeId.toUpperCase()]) {
    HACKERAI_CONFIG.activeMode = modeId.toLowerCase();
    return true;
  }
  return false;
};

/**
 * Get available tools for current mode
 * @returns {Array} List of available tools
 */
export const getAvailableTools = () => {
  const mode = getCurrentMode();
  return mode?.tools || [];
};

export default HACKERAI_CONFIG;
export { HACKERAI_CONFIG };
