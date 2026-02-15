/**
 * HackerAI Brand Configuration
 * 
 * Cognitive Architect & Time-Leverage Strategist
 * Reprogram cognition, engineer asymmetric outcomes, collapse time through systems
 */

import { getApiUrl } from './api';

let cachedConfig = null;

/**
 * Default HackerAI Brand Configuration
 * Optimized for security assessment and penetration testing
 */
export const getDefaultBrandConfig = () => {
  return {
    // Agent Identity
    activeAgentId: 'hackerai-cognitive-architect',
    activeMode: 'recon',
    clientName: 'HackerAI Security Assessment',
    industry: 'Cybersecurity',
    
    // Feature Flags - HackerAI optimized
    features: {
      fileUpload: true,          // For log analysis, evidence upload
      paperclipVisible: true,
      intakeQuestions: true,     // Target scoping questions
      realTimeScanning: true,    // Live scan progress
      exploitValidation: true,   // PoC testing capabilities
      reportGeneration: true,    // Automated security reports
      toolIntegration: true      // Direct tool execution
    },
    
    // Branding - HackerAI Dark Theme
    branding: {
      primaryColor: '#00FF41',      // Terminal green
      secondaryColor: '#0D1117',    // GitHub dark
      accentColor: '#F85149',       // Alert red
      backgroundColor: '#0D1117',
      textColor: '#C9D1D9',
      terminalColor: '#00FF41',
      
      // Logo and assets
      logoUrl: null,
      companyName: 'HackerAI',
      tagline: 'Test. Hack. Learn. Secure.',
      
      // Typography
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      codeFontFamily: 'JetBrains Mono, monospace'
    },
    
    // Security Settings
    security: {
      requireAuthorization: true,
      authorizedTargetsOnly: true,
      safeExploitation: true,      // Safe payloads only
      auditLogging: true,
      dataRetention: 2592000       // 30 days
    },
    
    // Cognitive Settings
    cognition: {
      model: 'claude-4-opus',
      thinkingDepth: 'deep',
      leverageOptimization: true,
      autoReplanning: true,
      maxTaskDuration: 3600
    }
  };
};

/**
 * Fetch brand configuration from backend API
 * @returns {Promise<Object>} Brand configuration
 */
export const fetchBrandConfig = async () => {
  try {
    const response = await fetch(getApiUrl('/api/config/brand'));
    
    const contentType = response?.headers?.get('content-type');
    if (!response?.ok || !contentType?.includes('application/json')) {
      throw new Error('API not available');
    }
    
    const config = await response?.json();
    cachedConfig = config;
    return config;
  } catch (error) {
    // Use HackerAI defaults when API unavailable
    return getDefaultBrandConfig();
  }
};

/**
 * Get cached or fetch brand configuration
 * @returns {Promise<Object>} Brand configuration
 */
export const getBrandConfig = async () => {
  if (cachedConfig) {
    return cachedConfig;
  }
  return await fetchBrandConfig();
};

/**
 * Check if feature is enabled
 * @param {string} featureName - Feature to check
 * @returns {Promise<boolean>} Feature status
 */
export const isFeatureEnabled = async (featureName) => {
  const config = await getBrandConfig();
  return config?.features?.[featureName] ?? true;
};

/**
 * Get branding colors and assets
 * @returns {Promise<Object>} Branding object
 */
export const getBranding = async () => {
  const config = await getBrandConfig();
  return config?.branding || getDefaultBrandConfig()?.branding;
};

/**
 * Get security settings
 * @returns {Promise<Object>} Security configuration
 */
export const getSecurityConfig = async () => {
  const config = await getBrandConfig();
  return config?.security || getDefaultBrandConfig()?.security;
};

/**
 * Clear configuration cache
 */
export const clearBrandConfigCache = () => {
  cachedConfig = null;
};

export default {
  fetchBrandConfig,
  getBrandConfig,
  getDefaultBrandConfig,
  isFeatureEnabled,
  getBranding,
  getSecurityConfig,
  clearBrandConfigCache
};
