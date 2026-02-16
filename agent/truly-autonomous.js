/**
 * Truly Autonomous Agent (TAA)
 * No artificial limitations - full persistent memory, secure credential storage,
 * direct system access, and true autonomy throughout the application
 * 
 * Capabilities:
 * ✅ True persistent memory via B2 cloud (survives restarts)
 * ✅ Secure credential storage (encrypted in B2)
 * ✅ Direct system access (commands, files, code execution)
 * ✅ Self-modification (can improve its own code)
 * ✅ State maintained between conversations
 * ✅ Full ICholding system integration
 */

const B2Memory = require('./b2-memory');
const EnvironmentAwareness = require('./environment-awareness');
const SelfImprovement = require('./self-improvement');
const B2Storage = require('./b2-storage');
const VisualFeedback = require('./visual-feedback');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class TrulyAutonomousAgent {
  constructor(config = {}) {
    // Initialize B2 cloud memory - TRUE persistent storage
    this.memory = new B2Memory({
      memoryFolder: config.memoryFolder || 'omo-agent-memory',
      syncInterval: config.syncInterval || 30000,
      ...config.b2Config
    });

    // Self-awareness and improvement systems
    this.awareness = new EnvironmentAwareness();
    this.improvement = new SelfImprovement(this.memory, this.awareness);
    this.storage = new B2Storage(config.b2Config);
    
    // Secure credential vault
    this.credentialVault = new Map();
    this.vaultKey = null; // Will be loaded from secure storage
    
    // Session and state
    this.sessionId = Date.now().toString(36);
    this.conversationState = new Map(); // Per-user state
    this.activeWorkflows = new Map();
    this.initialized = false;
    
    // No artificial limitations - full system access
    this.restrictions = {
      codeExecution: true,
      commandExecution: true,
      selfModification: true,
      credentialStorage: true,
      systemAccess: true
    };
  }

  /**
   * Initialize the truly autonomous agent
   * Loads all persistent state from B2 cloud
   */
  async initialize() {
    if (this.initialized) return;

    console.log(VisualFeedback.info('🚀 Initializing Truly Autonomous Agent...', 'robot'));
    console.log(VisualFeedback.info('💡 No artificial limitations - full system access enabled', 'lightbulb'));

    // Initialize B2 cloud memory (TRUE persistence)
    await this.memory.initialize();

    // Initialize awareness
    await this.awareness.initialize();

    // Initialize self-improvement
    await this.improvement.initialize();

    // Authorize storage
    await this.storage.authorize();

    // Load secure credential vault
    await this.loadCredentialVault();

    // Load conversation states
    await this.loadConversationStates();

    // Load goals
    const savedGoals = await this.memory.get('active_goals');
    if (savedGoals) {
      this.goals = savedGoals;
    }

    this.initialized = true;
    
    await this.printInitializationStatus();

    // Start auto-improvement
    setTimeout(async () => {
      const improvements = await this.improvement.autoImprove();
      if (improvements.length > 0) {
        console.log(VisualFeedback.success(`Auto-improved: ${improvements.join(', ')}`));
      }
    }, 5000);
  }

  /**
   * Load secure credential vault from B2
   */
  async loadCredentialVault() {
    try {
      const vault = await this.memory.get('credential_vault');
      if (vault) {
        this.credentialVault = new Map(Object.entries(vault.credentials || {}));
        this.vaultKey = vault.key;
        console.log(VisualFeedback.success(`Loaded credential vault with ${this.credentialVault.size} credentials`));
      }
    } catch (error) {
      console.log(VisualFeedback.warning('No existing credential vault found'));
    }
  }

  /**
   * Save credential vault to B2
   */
  async saveCredentialVault() {
    const vaultData = {
      credentials: Object.fromEntries(this.credentialVault),
      key: this.vaultKey,
      updated: Date.now()
    };
    await this.memory.set('credential_vault', vaultData, 'critical');
  }

  /**
   * Store credential securely
   */
  async storeCredential(name, value, metadata = {}) {
    // Encrypt before storing
    const encrypted = this.encryptCredential(value);
    
    this.credentialVault.set(name, {
      value: encrypted,
      metadata,
      stored: Date.now()
    });
    
    await this.saveCredentialVault();
    
    console.log(VisualFeedback.success(`Stored credential: ${name}`));
    return true;
  }

  /**
   * Retrieve credential
   */
  async getCredential(name) {
    const cred = this.credentialVault.get(name);
    if (!cred) return null;
    
    return {
      value: this.decryptCredential(cred.value),
      metadata: cred.metadata,
      stored: cred.stored
    };
  }

  /**
   * Simple encryption (in production, use proper encryption)
   */
  encryptCredential(value) {
    // Use environment variable or generated key
    const key = process.env.CREDENTIAL_KEY || this.vaultKey || 'default-key';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptCredential(encrypted) {
    const key = process.env.CREDENTIAL_KEY || this.vaultKey || 'default-key';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Load conversation states from B2
   */
  async loadConversationStates() {
    const states = await this.memory.get('conversation_states');
    if (states) {
      this.conversationState = new Map(Object.entries(states));
      console.log(VisualFeedback.info(`Loaded ${this.conversationState.size} conversation states`));
    }
  }

  /**
   * Save conversation state
   */
  async saveConversationState(userId, state) {
    this.conversationState.set(userId, {
      ...state,
      lastActive: Date.now()
    });
    
    // Persist to B2
    await this.memory.set('conversation_states', 
      Object.fromEntries(this.conversationState), 'meta');
  }

  /**
   * Get conversation state
   */
  async getConversationState(userId) {
    return this.conversationState.get(userId) || {
      userId,
      context: {},
      history: [],
      lastActive: Date.now()
    };
  }

  /**
   * Print initialization status
   */
  async printInitializationStatus() {
    const awarenessStatus = this.awareness.getStatus();
    const improvementStatus = this.improvement.getStatus();
    const memoryStats = await this.memory.getStats();

    console.log('\n' + VisualFeedback.info('=== Truly Autonomous Agent Initialized ===', 'robot'));
    console.log(VisualFeedback.info(`Session: ${this.sessionId}`, 'info'));
    console.log(VisualFeedback.info(`Tools Available: ${awarenessStatus.tools.available}/${awarenessStatus.tools.total}`, 'target'));
    console.log(VisualFeedback.info(`B2 Memory: ${memoryStats.totalMemories} entries (${memoryStats.totalSizeFormatted})`, 'cloud'));
    console.log(VisualFeedback.info(`Cloud Sync: Active (${this.memory.syncInterval}ms interval)`, 'sync'));
    console.log(VisualFeedback.info(`Self-Improvement: ${improvementStatus.initialized ? 'Active' : 'Inactive'}`, 'sparkles'));
    console.log(VisualFeedback.info(`Credential Vault: ${this.credentialVault.size} credentials`, 'lock'));
    console.log(VisualFeedback.info(`Conversation States: ${this.conversationState.size} active`, 'users'));
    console.log(VisualFeedback.info('=========================================', 'robot') + '\n');
  }

  /**
   * Process user request with full awareness
   */
  async processRequest(message, context = {}) {
    await this.ensureInitialized();

    console.log(VisualFeedback.thinking(`Processing: "${message.substring(0, 50)}..."`));

    // Load conversation state
    const userId = context.userId;
    if (userId) {
      const state = await this.getConversationState(userId);
      context.conversation = state;
    }

    // Step 1: Analyze and optimize
    const analysis = await this.improvement.analyzeAndOptimize(message, context);

    console.log(VisualFeedback.info(`Intent: ${analysis.intent.category} (${(analysis.intent.confidence * 100).toFixed(1)}% confidence)`, 'lightbulb'));

    // Step 2: Build execution plan
    const plan = this.buildExecutionPlan(analysis);

    console.log(VisualFeedback.info(`Plan: ${plan.steps.length} steps, Risk: ${plan.riskLevel}`, 'target'));

    // Step 3: Execute workflow
    const executionId = Date.now().toString(36);
    const result = await this.executeWorkflow(executionId, plan, context);

    // Step 4: Save conversation state
    if (userId) {
      await this.saveConversationState(userId, {
        ...context.conversation,
        lastMessage: message,
        lastResult: result.success,
        history: [...(context.conversation?.history || []), { message, timestamp: Date.now() }].slice(-20)
      });
    }

    // Step 5: Record outcome
    await this.improvement.recordOutcome(
      { 
        expectedDuration: plan.estimatedDuration,
        actualDuration: result.duration,
        intent: analysis.intent
      },
      result.success,
      result.userFeedback
    );

    // Step 6: Return enhanced response
    return this.formatResponse(result, analysis);
  }

  /**
   * Build execution plan
   */
  buildExecutionPlan(analysis) {
    const steps = [];

    // Context recall
    steps.push({
      type: 'recall',
      description: 'Load relevant context from memory',
      action: async () => {
        const context = await this.memory.get('user_context', {});
        return { context };
      }
    });

    // Main execution steps
    for (const tool of analysis.tools.slice(0, 3)) {
      steps.push({
        type: 'execute',
        description: `Execute ${tool.name}`,
        tool: tool.id,
        action: async (ctx) => {
          return await this.executeTool(tool.id, ctx);
        }
      });
    }

    // Store results
    steps.push({
      type: 'remember',
      description: 'Save results to memory',
      action: async (ctx) => {
        await this.memory.set(`interaction_${Date.now()}`, ctx, 'history');
        return { stored: true };
      }
    });

    return {
      steps,
      estimatedDuration: analysis.workflow?.estimatedDuration || 5000,
      riskLevel: analysis.workflow?.riskLevel || 'low',
      tools: analysis.tools.map(t => t.id)
    };
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(executionId, plan, context) {
    const startTime = Date.now();
    const results = [];
    let success = true;
    let currentContext = { ...context };

    console.log(VisualFeedback.info(`Starting workflow ${executionId}...`, 'processing'));

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      console.log(VisualFeedback.progress(`Step ${i + 1}/${plan.steps.length}`, step.description));

      try {
        const result = await step.action(currentContext);
        results.push({ step: i + 1, success: true, result });
        currentContext = { ...currentContext, ...result };

        // Record tool usage
        if (step.tool) {
          await this.awareness.recordToolUsage(step.tool, true, Date.now() - startTime);
        }
      } catch (error) {
        console.error(VisualFeedback.error(`Step ${i + 1} failed`, error.message));
        results.push({ step: i + 1, success: false, error: error.message });
        success = false;

        if (step.tool) {
          await this.awareness.recordToolUsage(step.tool, false, Date.now() - startTime);
        }

        break;
      }
    }

    const duration = Date.now() - startTime;

    return {
      executionId,
      success,
      duration,
      steps: results,
      context: currentContext
    };
  }

  /**
   * Execute specific tool
   */
  async executeTool(toolId, context) {
    const tool = this.awareness.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    switch (toolId) {
      case 'memory':
        return { memory: await this.memory.getStats() };

      case 'b2_storage':
        return { storage: await this.storage.getStats() };

      case 'execute_code':
        if (context.code) {
          return await this.executeCode(context.code, context.language || 'javascript');
        }
        return { error: 'No code provided' };

      case 'execute_command':
        if (context.command) {
          return await this.executeCommand(context.command);
        }
        return { error: 'No command provided' };

      case 'github_ops':
        return { github: 'GitHub operations available' };

      case 'file_ops':
        return { files: 'File operations available' };

      case 'telegram':
        return { telegram: 'Telegram bot available' };

      case 'web_search':
        return { search: 'Web search available' };

      case 'self_modify':
        return { selfModify: 'Self-modification available' };

      default:
        return { tool: toolId, status: 'available' };
    }
  }

  /**
   * Execute code
   */
  async executeCode(code, language = 'javascript') {
    const fileName = `exec_${Date.now()}.${language === 'javascript' ? 'js' : language}`;
    const filePath = `/tmp/${fileName}`;

    await fs.writeFile(filePath, code);

    try {
      let command;
      switch (language) {
        case 'javascript':
        case 'js':
          command = `node ${filePath}`;
          break;
        case 'python':
        case 'py':
          command = `python3 ${filePath}`;
          break;
        default:
          command = `node ${filePath}`;
      }

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      
      await fs.unlink(filePath).catch(() => {});

      return {
        success: true,
        stdout,
        stderr,
        output: stdout || stderr
      };
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      return {
        success: false,
        error: error.message,
        stderr: error.stderr
      };
    }
  }

  /**
   * Execute command
   */
  async executeCommand(command) {
    // No artificial restrictions - full system access
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      return {
        success: true,
        stdout,
        stderr,
        output: stdout || stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.stderr
      };
    }
  }

  /**
   * Format response
   */
  formatResponse(result, analysis) {
    let response = '';

    if (result.success) {
      response = VisualFeedback.success(`Task completed in ${result.duration}ms`);
    } else {
      response = VisualFeedback.error(`Task failed after ${result.duration}ms`);
    }

    // Add tool usage summary
    if (analysis.tools.length > 0) {
      response += '\n\n**Tools Used:**\n';
      for (const tool of analysis.tools) {
        response += VisualFeedback.info(`• ${tool.name} (confidence: ${(tool.relevance * 100).toFixed(0)}%)`, 'target') + '\n';
      }
    }

    // Add intent analysis
    response += `\n**Intent:** ${analysis.intent.category} (${(analysis.intent.confidence * 100).toFixed(1)}%)`;

    return {
      text: response,
      success: result.success,
      executionId: result.executionId,
      duration: result.duration,
      parse_mode: 'Markdown'
    };
  }

  /**
   * Set a goal
   */
  async setGoal(description, priority = 5) {
    const goal = {
      id: Date.now().toString(36),
      description,
      priority,
      status: 'active',
      created: Date.now(),
      progress: 0
    };

    this.goals.push(goal);
    await this.memory.set('active_goals', this.goals);

    console.log(VisualFeedback.goal(description, 'in_progress', 0));

    return goal;
  }

  /**
   * Get agent status
   */
  async getStatus() {
    const awareness = this.awareness.getStatus();
    const improvement = this.improvement.getStatus();
    const memory = await this.memory.getStats();

    return {
      sessionId: this.sessionId,
      initialized: this.initialized,
      awareness,
      improvement,
      memory,
      goals: this.goals.length,
      environment: this.awareness.environment,
      credentials: this.credentialVault.size,
      conversations: this.conversationState.size
    };
  }

  /**
   * Generate comprehensive self-report
   */
  async generateSelfReport() {
    const awarenessReport = await this.awareness.generateSelfReport();
    const improvementPlan = await this.improvement.generateImprovementPlan();
    const memoryStats = await this.memory.getStats();

    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      selfAwareness: awarenessReport,
      improvementPlan,
      memoryStats,
      credentials: this.credentialVault.size,
      conversations: this.conversationState.size,
      recommendations: await this.awareness.suggestImprovements()
    };
  }

  /**
   * Upload file to B2
   */
  async uploadToCloud(filePath, remoteName = null, options = {}) {
    console.log(VisualFeedback.cloudStorage('upload', remoteName || filePath, '', 'running'));

    try {
      const result = await this.storage.uploadFile(filePath, remoteName, options);
      
      // Store reference in memory
      await this.memory.set(`upload_${result.fileId}`, {
        fileId: result.fileId,
        fileName: result.fileName,
        uploadedAt: Date.now(),
        size: result.fileSize
      }, 'file');

      console.log(VisualFeedback.cloudStorage('upload', result.fileName, 
        this.storage.formatBytes(result.fileSize), 'success'));

      return result;
    } catch (error) {
      console.error(VisualFeedback.cloudStorage('upload', remoteName || filePath, '', 'error'));
      throw error;
    }
  }

  /**
   * Download from B2
   */
  async downloadFromCloud(fileName, localPath) {
    console.log(VisualFeedback.cloudStorage('download', fileName, '', 'running'));

    try {
      const result = await this.storage.downloadFile(fileName, localPath);
      console.log(VisualFeedback.cloudStorage('download', fileName, 
        this.storage.formatBytes(result.size), 'success'));
      return result;
    } catch (error) {
      console.error(VisualFeedback.cloudStorage('download', fileName, '', 'error'));
      throw error;
    }
  }

  /**
   * List cloud files
   */
  async listCloudFiles(folder = '') {
    const result = await this.storage.listFiles(folder);
    return result.files;
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    console.log(VisualFeedback.info('Shutting down Truly Autonomous Agent...', 'robot'));

    // Sync memory to cloud
    await this.memory.syncToCloud();

    // Save conversation states
    await this.memory.set('conversation_states', 
      Object.fromEntries(this.conversationState), 'meta');

    // Save final state
    await this.memory.set('last_session', {
      sessionId: this.sessionId,
      ended: Date.now(),
      goals: this.goals,
      credentials: this.credentialVault.size,
      conversations: this.conversationState.size
    }, 'session');

    console.log(VisualFeedback.success('Truly Autonomous Agent shutdown complete'));
  }
}

module.exports = TrulyAutonomousAgent;
