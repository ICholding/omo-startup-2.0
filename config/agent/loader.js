/**
 * Agent Role Configuration Loader
 * Loads and provides access to agent role configuration
 * 
 * Usage:
 *   const { loadAgentConfig, getTemplate, formatDate } = require('./config/agent/loader');
 *   const config = loadAgentConfig();
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'role.json');

/**
 * Load agent role configuration
 * @returns {Object} Parsed configuration object
 */
function loadAgentConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[AgentConfig] Failed to load configuration:', error.message);
    throw error;
  }
}

/**
 * Get a specific template by name
 * @param {string} templateName - Name of the template (pentestReport, projectSummary, configFix)
 * @returns {string} Template string with placeholders
 */
function getTemplate(templateName) {
  const config = loadAgentConfig();
  const template = config.templates[templateName];
  
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  return template;
}

/**
 * Fill template placeholders with values
 * @param {string} template - Template string with {placeholders}
 * @param {Object} values - Key-value pairs to replace
 * @returns {string} Filled template
 */
function fillTemplate(template, values) {
  let result = template;
  
  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholder, value);
  }
  
  return result;
}

/**
 * Get response examples for a specific type
 * @param {string} type - Type of response (greeting, statusCheckin, acknowledgment, confirmation)
 * @returns {string[]} Array of example responses
 */
function getResponseExamples(type) {
  const config = loadAgentConfig();
  const examples = config.toneStyle.shortResponses.examples[type];
  
  if (!examples) {
    throw new Error(`Response examples not found for type: ${type}`);
  }
  
  return examples;
}

/**
 * Format date for reports
 * @param {Date} date - Date object (defaults to now)
 * @returns {string} Formatted date string
 */
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Format datetime for detailed logs
 * @param {Date} date - Date object (defaults to now)
 * @returns {string} Formatted datetime string
 */
function formatDateTime(date = new Date()) {
  return date.toISOString();
}

/**
 * Detect if a query should trigger a short or long response
 * @param {string} query - User query
 * @returns {string} 'short' or 'long'
 */
function detectResponseMode(query) {
  const config = loadAgentConfig();
  const lowerQuery = query.toLowerCase();
  
  // Check for long response triggers
  const longTriggers = [
    'summarize', 'report', 'show me', 'explain', 'details',
    'results', 'findings', 'analysis', 'complete', 'finished',
    'done', 'summary', 'overview', 'status of', 'progress on'
  ];
  
  for (const trigger of longTriggers) {
    if (lowerQuery.includes(trigger)) {
      return 'long';
    }
  }
  
  // Check for short response indicators
  const shortIndicators = [
    'ok', 'thanks', 'got it', 'sure', 'yes', 'no',
    '?', 'hi', 'hello', 'hey'
  ];
  
  // Very short queries are likely short responses
  if (query.length < 20) {
    return 'short';
  }
  
  return 'short';
}

/**
 * Generate a project summary report
 * @param {Object} data - Report data
 * @returns {string} Formatted report
 */
function generateProjectSummary(data) {
  const template = getTemplate('projectSummary');
  
  const values = {
    taskName: data.taskName || 'Unnamed Task',
    date: formatDate(data.date),
    description: data.description || 'No description provided',
    bulletListOfChanges: formatBulletList(data.changes),
    testOutcomes: formatBulletList(data.testResults),
    fileListWithStats: formatFileList(data.files),
    followUpActions: formatBulletList(data.nextSteps)
  };
  
  return fillTemplate(template, values);
}

/**
 * Generate a security report
 * @param {Object} data - Security scan data
 * @returns {string} Formatted security report
 */
function generateSecurityReport(data) {
  const template = getTemplate('pentestReport');
  
  const values = {
    serviceName: data.serviceName || 'Unknown Service',
    date: formatDate(data.date),
    briefOverview: data.overview || 'No overview provided',
    criticalFindings: formatVulnerabilities(data.critical || []),
    highFindings: formatVulnerabilities(data.high || []),
    mediumFindings: formatVulnerabilities(data.medium || []),
    lowFindings: formatVulnerabilities(data.low || []),
    numberedRecommendations: formatNumberedList(data.recommendations),
    actionItems: formatBulletList(data.nextSteps)
  };
  
  return fillTemplate(template, values);
}

// Helper functions

function formatBulletList(items) {
  if (!items || items.length === 0) {
    return '- No items to report';
  }
  return items.map(item => `- ${item}`).join('\n');
}

function formatNumberedList(items) {
  if (!items || items.length === 0) {
    return '1. No recommendations provided';
  }
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

function formatFileList(files) {
  if (!files || files.length === 0) {
    return '- No files modified';
  }
  return files.map(f => `- \`${f.path}\` (${f.changes || 'modified'})`).join('\n');
}

function formatVulnerabilities(vulns) {
  if (!vulns || vulns.length === 0) {
    return 'None identified.';
  }
  
  return vulns.map(v => {
    let text = `**${v.name}**: ${v.location}\n`;
    text += `- **Risk**: ${v.risk}\n`;
    text += `- **Fix**: ${v.fix}`;
    return text;
  }).join('\n\n');
}

module.exports = {
  loadAgentConfig,
  getTemplate,
  fillTemplate,
  getResponseExamples,
  formatDate,
  formatDateTime,
  detectResponseMode,
  generateProjectSummary,
  generateSecurityReport
};
