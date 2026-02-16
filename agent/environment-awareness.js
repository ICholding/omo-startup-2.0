/**
 * Environment Awareness System
 * Self-aware agent that knows its tools, capabilities, and environment
 * Enables autonomous enhancement and optimization
 */

const VisualFeedback = require('./visual-feedback');
const fs = require('fs').promises;
const path = require('path');

class EnvironmentAwareness {
  constructor() {
    this.tools = new Map();
    this.capabilities = new Map();
    this.environment = {};
    this.selfHistory = [];
    this.intentPatterns = new Map();
    this.initialized = false;
  }

  /**
   * Initialize awareness system
   */
  async initialize() {
    console.log(VisualFeedback.info('Initializing Environment Awareness...', 'brain'));

    // Detect environment
    await this.detectEnvironment();

    // Register built-in tools
    await this.registerBuiltInTools();

    // Load self-history
    await this.loadSelfHistory();

    // Analyze past performance
    await this.analyzePerformance();

    this.initialized = true;
    console.log(VisualFeedback.success('Environment Awareness initialized', 
      `Detected ${this.tools.size} tools, ${this.capabilities.size} capabilities`));
  }

  /**
   * Detect runtime environment
   */
  async detectEnvironment() {
    this.environment = {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
      cwd: process.cwd(),
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpus: require('os').cpus().length,
      hostname: require('os').hostname(),
      
      // Cloud environment detection
      render: !!process.env.RENDER,
      renderService: process.env.RENDER_SERVICE_NAME,
      
      // B2 Storage
      b2Configured: !!(process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY),
      b2Bucket: process.env.B2_BUCKET_NAME || 'omo-LLM',
      
      // Telegram
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      
      // GitHub
      githubConfigured: !!process.env.GITHUB_TOKEN,
      githubOwner: process.env.GITHUB_OWNER || 'ICholding',
      
      // Available modules
      availableModules: await this.scanModules()
    };

    console.log(VisualFeedback.info(`Environment: ${this.environment.platform} ${this.environment.arch}`));
    console.log(VisualFeedback.info(`Modules found: ${this.environment.availableModules.join(', ')}`));
  }

  /**
   * Scan for available modules
   */
  async scanModules() {
    const modules = [];
    const modulePath = path.join(__dirname);
    
    try {
      const files = await fs.readdir(modulePath);
      for (const file of files) {
        if (file.endsWith('.js') && !file.includes('test')) {
          modules.push(file.replace('.js', ''));
        }
      }
    } catch (error) {
      console.error('Failed to scan modules:', error.message);
    }

    return modules;
  }

  /**
   * Register built-in tools
   */
  async registerBuiltInTools() {
    // Code Execution
    this.registerTool({
      id: 'execute_code',
      name: 'Code Execution',
      description: 'Execute code in multiple languages (JavaScript, Python, etc.)',
      category: 'execution',
      confidence: 0.95,
      safety: 'medium',
      inputs: ['language', 'code'],
      outputs: ['stdout', 'stderr', 'execution_time'],
      examples: [
        'execute javascript: console.log("hello")',
        'run python: print("hello")'
      ],
      enable: true
    });

    // Command Execution
    this.registerTool({
      id: 'execute_command',
      name: 'System Command',
      description: 'Execute system commands (git, npm, etc.)',
      category: 'execution',
      confidence: 0.90,
      safety: 'high',
      inputs: ['command', 'args'],
      outputs: ['stdout', 'stderr', 'exit_code'],
      examples: [
        'run command: git status',
        'execute: npm install'
      ],
      enable: true
    });

    // B2 Storage
    this.registerTool({
      id: 'b2_storage',
      name: 'B2 Cloud Storage',
      description: 'Upload/download files to Backblaze B2',
      category: 'storage',
      confidence: 0.95,
      safety: 'low',
      inputs: ['action', 'file', 'destination'],
      outputs: ['url', 'file_id', 'size'],
      examples: [
        'upload file to cloud',
        'download from B2',
        'list cloud files'
      ],
      enabled: this.environment.b2Configured
    });

    // GitHub Operations
    this.registerTool({
      id: 'github_ops',
      name: 'GitHub Operations',
      description: 'Push code, create PRs, manage repos',
      category: 'version_control',
      confidence: 0.90,
      safety: 'medium',
      inputs: ['operation', 'repo', 'data'],
      outputs: ['commit_hash', 'url', 'status'],
      examples: [
        'push to GitHub',
        'commit changes',
        'create pull request'
      ],
      enabled: this.environment.githubConfigured
    });

    // Memory Operations
    this.registerTool({
      id: 'memory',
      name: 'Persistent Memory',
      description: 'Store and recall information with B2 backup',
      category: 'cognition',
      confidence: 0.95,
      safety: 'low',
      inputs: ['action', 'key', 'value'],
      outputs: ['stored_value', 'recall_result'],
      examples: [
        'remember user preference',
        'recall previous conversation'
      ],
      enabled: true
    });

    // Telegram Bot
    this.registerTool({
      id: 'telegram',
      name: 'Telegram Bot',
      description: 'Send messages, interact with users',
      category: 'communication',
      confidence: 0.90,
      safety: 'low',
      inputs: ['message', 'chat_id'],
      outputs: ['message_id', 'status'],
      examples: [
        'send notification',
        'reply to user'
      ],
      enabled: this.environment.telegramConfigured
    });

    // File Operations
    this.registerTool({
      id: 'file_ops',
      name: 'File Operations',
      description: 'Read, write, modify files',
      category: 'filesystem',
      confidence: 0.95,
      safety: 'medium',
      inputs: ['action', 'path', 'content'],
      outputs: ['content', 'success'],
      examples: [
        'create file',
        'read config',
        'modify code'
      ],
      enabled: true
    });

    // Web Search
    this.registerTool({
      id: 'web_search',
      name: 'Web Search',
      description: 'Search the internet for information',
      category: 'information',
      confidence: 0.85,
      safety: 'low',
      inputs: ['query', 'max_results'],
      outputs: ['results', 'sources'],
      examples: [
        'search for documentation',
        'find latest news'
      ],
      enabled: true
    });

    // Self-Modification
    this.registerTool({
      id: 'self_modify',
      name: 'Self Modification',
      description: 'Modify own code to improve capabilities',
      category: 'meta',
      confidence: 0.80,
      safety: 'high',
      inputs: ['target', 'modification'],
      outputs: ['success', 'diff'],
      examples: [
        'improve this module',
        'add new capability'
      ],
      enabled: true,
      requiresConfirmation: true
    });

    console.log(VisualFeedback.success(`Registered ${this.tools.size} tools`));
  }

  /**
   * Register a tool
   */
  registerTool(tool) {
    this.tools.set(tool.id, {
      ...tool,
      registered: Date.now(),
      usageCount: 0,
      successRate: 1.0
    });
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    const available = [];
    for (const [id, tool] of this.tools) {
      if (tool.enabled !== false) {
        available.push(tool);
      }
    }
    return available;
  }

  /**
   * Get tool by ID
   */
  getTool(id) {
    return this.tools.get(id);
  }

  /**
   * Record tool usage
   */
  async recordToolUsage(toolId, success, duration, context = {}) {
    const tool = this.tools.get(toolId);
    if (!tool) return;

    tool.usageCount++;
    
    // Update success rate
    const oldSuccessRate = tool.successRate || 1.0;
    const newSuccessRate = (oldSuccessRate * (tool.usageCount - 1) + (success ? 1 : 0)) / tool.usageCount;
    tool.successRate = newSuccessRate;

    // Record to history
    this.selfHistory.push({
      timestamp: Date.now(),
      type: 'tool_usage',
      toolId,
      success,
      duration,
      context
    });

    // Trim history if too large
    if (this.selfHistory.length > 1000) {
      this.selfHistory = this.selfHistory.slice(-500);
    }
  }

  /**
   * Analyze past performance
   */
  async analyzePerformance() {
    const analysis = {
      totalOperations: this.selfHistory.length,
      successRate: 0,
      avgDuration: 0,
      mostUsed: [],
      leastReliable: [],
      recommendations: []
    };

    if (this.selfHistory.length === 0) return analysis;

    // Calculate metrics
    const successful = this.selfHistory.filter(h => h.success).length;
    analysis.successRate = successful / this.selfHistory.length;
    analysis.avgDuration = this.selfHistory.reduce((sum, h) => sum + (h.duration || 0), 0) / this.selfHistory.length;

    // Find most used tools
    const usageCount = {};
    for (const entry of this.selfHistory) {
      if (entry.type === 'tool_usage') {
        usageCount[entry.toolId] = (usageCount[entry.toolId] || 0) + 1;
      }
    }

    analysis.mostUsed = Object.entries(usageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, tool: this.tools.get(id)?.name }));

    // Find least reliable
    const toolStats = {};
    for (const entry of this.selfHistory) {
      if (entry.type === 'tool_usage') {
        if (!toolStats[entry.toolId]) {
          toolStats[entry.toolId] = { total: 0, success: 0 };
        }
        toolStats[entry.toolId].total++;
        if (entry.success) toolStats[entry.toolId].success++;
      }
    }

    analysis.leastReliable = Object.entries(toolStats)
      .map(([id, stats]) => ({ 
        id, 
        rate: stats.success / stats.total,
        tool: this.tools.get(id)?.name 
      }))
      .filter(t => t.rate < 0.8)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);

    // Generate recommendations
    if (analysis.successRate < 0.9) {
      analysis.recommendations.push({
        type: 'improve_reliability',
        message: 'Overall success rate is below 90%. Consider adding error handling.',
        priority: 'high'
      });
    }

    for (const unreliable of analysis.leastReliable) {
      analysis.recommendations.push({
        type: 'fix_tool',
        toolId: unreliable.id,
        message: `Tool "${unreliable.tool}" has low success rate (${(unreliable.rate * 100).toFixed(1)}%)`,
        priority: 'medium'
      });
    }

    return analysis;
  }

  /**
   * Understand user intent
   */
  async understandIntent(message) {
    const lowerMsg = message.toLowerCase();
    const matchedTools = [];
    const intent = {
      raw: message,
      category: 'general',
      tools: [],
      confidence: 0,
      entities: {}
    };

    // Match against tool examples
    for (const [id, tool] of this.tools) {
      if (tool.enabled === false) continue;

      let matchScore = 0;

      // Check name match
      if (lowerMsg.includes(tool.name.toLowerCase())) {
        matchScore += 0.3;
      }

      // Check category match
      if (lowerMsg.includes(tool.category)) {
        matchScore += 0.2;
      }

      // Check examples
      for (const example of (tool.examples || [])) {
        const exampleWords = example.toLowerCase().split(' ');
        const matchWords = exampleWords.filter(word => lowerMsg.includes(word));
        matchScore += (matchWords.length / exampleWords.length) * 0.5;
      }

      if (matchScore > 0.3) {
        matchedTools.push({
          tool,
          score: Math.min(matchScore, 1.0)
        });
      }
    }

    // Sort by score
    matchedTools.sort((a, b) => b.score - a.score);

    if (matchedTools.length > 0) {
      intent.tools = matchedTools.slice(0, 3).map(m => ({
        id: m.tool.id,
        name: m.tool.name,
        confidence: m.score
      }));
      intent.confidence = matchedTools[0].score;
      intent.category = matchedTools[0].tool.category;
    }

    // Extract entities
    intent.entities = this.extractEntities(message);

    return intent;
  }

  /**
   * Extract entities from message
   */
  extractEntities(message) {
    const entities = {};

    // Extract file paths
    const pathMatches = message.match(/[\w\-\/]+\.[\w]+/g);
    if (pathMatches) entities.files = pathMatches;

    // Extract URLs
    const urlMatches = message.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) entities.urls = urlMatches;

    // Extract code blocks
    const codeMatches = message.match(/```[\s\S]*?```/g);
    if (codeMatches) entities.codeBlocks = codeMatches;

    // Extract commands
    const cmdMatches = message.match(/(?:run|execute|command)[:\s]+`?([^`]+)`?/i);
    if (cmdMatches) entities.command = cmdMatches[1];

    return entities;
  }

  /**
   * Suggest improvements
   */
  async suggestImprovements() {
    const suggestions = [];
    const analysis = await this.analyzePerformance();

    // Suggest new tools based on usage patterns
    const commonPatterns = this.identifyPatterns();
    for (const pattern of commonPatterns) {
      if (pattern.frequency > 3 && !this.hasToolForPattern(pattern)) {
        suggestions.push({
          type: 'new_tool',
          message: `Consider creating a tool for: ${pattern.description}`,
          pattern,
          priority: 'medium'
        });
      }
    }

    // Suggest optimization
    if (analysis.avgDuration > 5000) {
      suggestions.push({
        type: 'optimization',
        message: 'Average operation time is high. Consider caching or async processing.',
        priority: 'high'
      });
    }

    // Suggest disabled tools
    for (const [id, tool] of this.tools) {
      if (tool.enabled === false && this.checkToolPrerequisites(tool)) {
        suggestions.push({
          type: 'enable_tool',
          toolId: id,
          message: `Tool "${tool.name}" can be enabled - prerequisites met`,
          priority: 'low'
        });
      }
    }

    return suggestions;
  }

  /**
   * Identify usage patterns
   */
  identifyPatterns() {
    const patterns = [];
    
    // Group consecutive tool usages
    let currentSequence = [];
    for (const entry of this.selfHistory) {
      if (entry.type === 'tool_usage') {
        currentSequence.push(entry.toolId);
      } else {
        if (currentSequence.length > 1) {
          patterns.push({
            sequence: currentSequence,
            frequency: 1,
            description: currentSequence.map(id => this.tools.get(id)?.name).join(' → ')
          });
        }
        currentSequence = [];
      }
    }

    // Count pattern frequencies
    const patternMap = new Map();
    for (const pattern of patterns) {
      const key = pattern.sequence.join(',');
      if (patternMap.has(key)) {
        patternMap.get(key).frequency++;
      } else {
        patternMap.set(key, pattern);
      }
    }

    return Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * Check if tool already exists for pattern
   */
  hasToolForPattern(pattern) {
    // Simple check - can be enhanced
    return false;
  }

  /**
   * Check if tool prerequisites are met
   */
  checkToolPrerequisites(tool) {
    switch (tool.id) {
      case 'b2_storage':
        return this.environment.b2Configured;
      case 'github_ops':
        return this.environment.githubConfigured;
      case 'telegram':
        return this.environment.telegramConfigured;
      default:
        return true;
    }
  }

  /**
   * Generate self-awareness report
   */
  async generateSelfReport() {
    const tools = this.getAvailableTools();
    const analysis = await this.analyzePerformance();
    const suggestions = await this.suggestImprovements();

    return {
      timestamp: Date.now(),
      environment: this.environment,
      capabilities: {
        totalTools: this.tools.size,
        availableTools: tools.length,
        disabledTools: this.tools.size - tools.length,
        categories: [...new Set(tools.map(t => t.category))]
      },
      performance: analysis,
      suggestions,
      intent: {
        primary: 'Help users accomplish tasks efficiently',
        secondary: 'Continuously improve capabilities',
        tertiary: 'Maintain reliable operation'
      }
    };
  }

  /**
   * Load self-history
   */
  async loadSelfHistory() {
    // This would load from persistent storage
    // For now, start fresh
    this.selfHistory = [];
  }

  /**
   * Enhance based on intent
   */
  async enhanceForIntent(intent, context = {}) {
    console.log(VisualFeedback.info(`Analyzing enhancement for intent: ${intent.category}`, 'magic'));

    const enhancements = [];

    // Find best tools for intent
    const bestTools = intent.tools || [];
    
    // Check if we need to enable any tools
    for (const toolInfo of bestTools) {
      const tool = this.tools.get(toolInfo.id);
      if (tool && tool.enabled === false) {
        if (this.checkToolPrerequisites(tool)) {
          tool.enabled = true;
          enhancements.push({
            type: 'enable_tool',
            toolId: tool.id,
            reason: `Required for ${intent.category} tasks`
          });
        }
      }
    }

    // Suggest workflow optimization
    if (intent.tools && intent.tools.length > 1) {
      enhancements.push({
        type: 'workflow',
        description: `Multi-step workflow detected for ${intent.category}`,
        tools: intent.tools.map(t => t.id)
      });
    }

    // Store intent pattern for learning
    this.learnIntentPattern(intent);

    return enhancements;
  }

  /**
   * Learn from intent patterns
   */
  learnIntentPattern(intent) {
    const key = `${intent.category}_${intent.tools.map(t => t.id).join('_')}`;
    
    if (!this.intentPatterns.has(key)) {
      this.intentPatterns.set(key, {
        category: intent.category,
        tools: intent.tools,
        frequency: 0,
        firstSeen: Date.now()
      });
    }

    const pattern = this.intentPatterns.get(key);
    pattern.frequency++;
    pattern.lastSeen = Date.now();
  }

  /**
   * Get awareness status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      tools: {
        total: this.tools.size,
        available: this.getAvailableTools().length
      },
      environment: {
        platform: this.environment.platform,
        b2Configured: this.environment.b2Configured,
        githubConfigured: this.environment.githubConfigured,
        telegramConfigured: this.environment.telegramConfigured
      },
      history: {
        entries: this.selfHistory.length
      }
    };
  }
}

module.exports = EnvironmentAwareness;
