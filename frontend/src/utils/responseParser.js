/**
 * Response Parser Utility
 * Parses and extracts clean message content from various response formats
 */

/**
 * Parse response content and extract readable text
 * Handles JSON, HTTP responses, and plain text
 */
export const parseResponseContent = (content) => {
  if (!content) return '';
  
  // If it's already a clean string without HTTP artifacts, return as-is
  if (typeof content === 'string' && !content.includes('"status":') && !content.includes('"headers":')) {
    return content.trim();
  }
  
  // Try to parse as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return extractFromParsed(parsed);
    } catch (e) {
      // Not valid JSON, continue to other parsing
    }
  }
  
  // Handle object directly
  if (typeof content === 'object') {
    return extractFromParsed(content);
  }
  
  // Clean up HTTP artifacts from string
  return cleanHttpArtifacts(content);
};

/**
 * Extract readable text from parsed object
 */
const extractFromParsed = (data) => {
  if (!data) return '';
  
  // Handle array of messages
  if (Array.isArray(data)) {
    return data.map(item => extractFromParsed(item)).join('\n');
  }
  
  // Try to find the actual message content in common locations
  if (data.message) return String(data.message);
  if (data.content) return String(data.content);
  if (data.text) return String(data.text);
  if (data.response) return String(data.response);
  if (data.result) return String(data.result);
  if (data.summary) return String(data.summary);
  if (data.output) return String(data.output);
  
  // Handle WhatsApp/OpenClaw message format
  if (data.Body) return String(data.Body);
  if (data.body) return String(data.body);
  
  // If we have choices (OpenAI format), extract the content
  if (data.choices && data.choices[0]) {
    const choice = data.choices[0];
    if (choice.message?.content) return choice.message.content;
    if (choice.text) return choice.text;
  }
  
  // If no recognized fields, return stringified (but cleaned)
  const stringified = JSON.stringify(data, null, 2);
  return cleanHttpArtifacts(stringified);
};

/**
 * Clean HTTP artifacts from string content
 */
const cleanHttpArtifacts = (content) => {
  if (!content || typeof content !== 'string') return '';
  
  let cleaned = content;
  
  // Remove HTTP headers section if present
  cleaned = cleaned.replace(/"headers":\s*\{[^}]*\}/g, '');
  cleaned = cleaned.replace(/"status":\s*\d+/g, '');
  cleaned = cleaned.replace(/"statusCode":\s*\d+/g, '');
  cleaned = cleaned.replace(/"statusText":\s*"[^"]*"/g, '');
  
  // Remove content-type and other header noise
  cleaned = cleaned.replace(/content-type[^,}]*[,}]?/gi, '');
  cleaned = cleaned.replace(/content-security-policy[^,}]*[,}]?/gi, '');
  cleaned = cleaned.replace(/set-cookie[^,}]*[,}]?/gi, '');
  cleaned = cleaned.replace(/x-[^:]*:[^,}]*[,}]?/gi, '');
  
  // Remove date/server entries
  cleaned = cleaned.replace(/"date":\s*"[^"]*"/g, '');
  cleaned = cleaned.replace(/"server":\s*"[^"]*"/g, '');
  cleaned = cleaned.replace(/"expires":\s*"[^"]*"/g, '');
  cleaned = cleaned.replace(/"cache-control":\s*"[^"]*"/g, '');
  
  // Remove cookie data
  cleaned = cleaned.replace(/"AEC=[^"]*"/g, '');
  cleaned = cleaned.replace(/"NID=[^"]*"/g, '');
  cleaned = cleaned.replace(/"__Secure-[^"]*"/g, '');
  
  // Clean up JSON artifacts
  cleaned = cleaned.replace(/\{\s*,+/g, '{');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/,\s*\}/g, '}');
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  
  // Remove empty arrays and objects
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  
  // Remove trailing/leading commas and whitespace
  cleaned = cleaned.replace(/^[\s,]+|[\s,]+$/g, '');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  
  return cleaned.trim();
};

/**
 * Check if content contains HTTP response artifacts
 */
export const containsHttpArtifacts = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  const httpIndicators = [
    '"status":',
    '"headers":',
    '"statusCode":',
    'content-type',
    'content-security-policy',
    '"server":',
    '"date":',
    '"set-cookie":'
  ];
  
  return httpIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
};

/**
 * Format message for display
 * Ensures clean, readable output
 */
export const formatMessageForDisplay = (content) => {
  const parsed = parseResponseContent(content);
  
  // If still has artifacts, do aggressive cleaning
  if (containsHttpArtifacts(parsed)) {
    return cleanHttpArtifacts(parsed);
  }
  
  return parsed;
};

export default {
  parseResponseContent,
  containsHttpArtifacts,
  formatMessageForDisplay
};
