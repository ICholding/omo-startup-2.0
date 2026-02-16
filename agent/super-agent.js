/**
 * Super Autonomous Agent (SAA)
 * Fully self-aware agent with B2 cloud memory, environment awareness,
 * and continuous self-improvement capabilities
 * 
 * This agent is:
 * - Cloud-backed (B2 storage)
 * - Self-aware (knows its tools, capabilities, environment)
 * - Self-improving (learns and enhances based on intent)
 * - Intent-optimized (selects best approach for each task)
 */

const B2Memory = require('./b2-memory');
const EnvironmentAwareness = require('./environment-awareness');
const SelfImprovement = require('./self-improvement');
const B2Storage = require('./b2-storage');
const VisualFeedback = require('./visual-feedback');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SuperAgent {
  constructor(config = {}) {
    this.memory = new B2Memory({
      memoryFolder: config.memoryFolder || 'omo-agent-memory',
      syncInterval: config.syncInterval || 30000,
      ...config.b2Config
    });

    this.awareness = new EnvironmentAwareness();
    this.improvement = new SelfImprovement(this.memory, this.awareness);
    this.storage = new B2Storage(config.b2Config);
    
    this.sessionId = Date.now().toString(36);
    this.goals = [];
    this.initialized = false;
    this.activeWorkflows = new Map();
  }

  /**
   * Initialize the super agent
   */
  async initialize() {
    if (this.initialized) return;

    console.log(VisualFeedback.info('🚀 Initializing Super Autonomous Agent...', 'robot'));
    console.log(VisualFeedback.info(`Session ID: ${this.sessionId}`, 'info'));

    // Initialize B2 memory
    await this.memory.initialize();

    // Initialize awareness
    await this.awareness.initialize();

    // Initialize self-improvement
    await this.improvement.initialize();

    // Authorize storage
    await this.storage.authorize();

    // Load existing goals
    const savedGoals = await this.memory.get('active_goals');
    if (savedGoals) {
      this.goals = savedGoals;
    }

    this.initialized = true;
    
    // Print status
    await this.printInitializationStatus();

    // Run auto-improvement
    setTimeout(async () => {
      await this.improvement.autoImprove();
    }, 5000);
  }

  /**
   * Print initialization status
   */
  async printInitializationStatus() {
    const awarenessStatus = this.awareness.getStatus();
    const improvementStatus = this.improvement.getStatus();
    const memoryStats = await this.memory.getStats();

    console.log('\n' + VisualFeedback.info('=== Super Agent Initialized ===', 'robot'));
    console.log(VisualFeedback.info(`Session: ${this.sessionId}`, 'info'));
    console.log(VisualFeedback.info(`Tools Available: ${awarenessStatus.tools.available}/${awarenessStatus.tools.total}`, 'target'));
    console.log(VisualFeedback.info(`B2 Memory: ${memoryStats.totalMemories} entries (${memoryStats.totalSizeFormatted})`, 'cloud'));
    console.log(VisualFeedback.info(`Cloud Sync: Active (${this.memory.syncInterval}ms interval)`, 'sync'));
    console.log(VisualFeedback.info(`Self-Improvement: ${improvementStatus.initialized ? 'Active' : 'Inactive'}`, 'sparkles'));
    console.log(VisualFeedback.info('================================', 'robot') + '\n');
  }

  /**
   * Process user request with full awareness
   */
  async processRequest(message, context = {}) {
    await this.ensureInitialized();

    console.log(VisualFeedback.thinking(`Processing: "${message.substring(0, 50)}..."`));

    // Step 1: Analyze and optimize
    const analysis = await this.improvement.analyzeAndOptimize(message, context);

    console.log(VisualFeedback.info(`Intent: ${analysis.intent.category} (${(analysis.intent.confidence * 100).toFixed(1)}% confidence)`, 'lightbulb'));

    // Step 2: Build execution plan
    const plan = this.buildExecutionPlan(analysis);

    console.log(VisualFeedback.info(`Plan: ${plan.steps.length} steps, Risk: ${plan.riskLevel}`, 'target'));

    // Step 3: Execute workflow
    const executionId = Date.now().toString(36);
    const result = await this.executeWorkflow(executionId, plan, context);

    // Step 4: Record outcome
    await this.improvement.recordOutcome(
      { 
        expectedDuration: plan.estimatedDuration,
        actualDuration: result.duration,
        intent: analysis.intent
      },
      result.success,
      result.userFeedback
    );

    // Step 5: Return enhanced response
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
        // Requires code in context
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

    const fs = require('fs').promises;
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
      
      // Cleanup
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
    const allowedCommands = ['git', 'npm', 'node', 'ls', 'cat', 'pwd', 'echo', 'mkdir'];
    const cmdBase = command.split(' ')[0];

    if (!allowedCommands.includes(cmdBase)) {
      return {
        success: false,
        error: `Command '${cmdBase}' not allowed`
      };
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
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
      environment: this.awareness.environment
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
    console.log(VisualFeedback.info('Shutting down Super Agent...', 'robot'));

    // Sync memory to cloud
    await this.memory.syncToCloud();

    // Save final state
    await this.memory.set('last_session', {
      sessionId: this.sessionId,
      ended: Date.now(),
      goals: this.goals
    }, 'session');

    console.log(VisualFeedback.success('Super Agent shutdown complete'));
  }
}

module.exports = SuperAgent;

// Demo if run directly
if (require.main === module) {
  const agent = new SuperAgent();
  
  async function demo() {
    try {
      await agent.initialize();

      console.log('\n=== Super Agent Demo ===\n');

      // Test 1: Process a request
      console.log('1. Testing request processing...');
      const result = await agent.processRequest('Show me the current status', {});
      console.log('Result:', result.text);

      // Test 2: Get status
      console.log('\n2. Getting agent status...');
      const status = await agent.getStatus();
      console.log('Status:', JSON.stringify(status, null, 2));

      // Test 3: Generate self-report
      console.log('\n3. Generating self-report...');
      const report = await agent.generateSelfReport();
      console.log('Self-awareness score:', report.selfAwareness.capabilities.totalTools);

      console.log('\n=== Demo Complete ===\n');

      await agent.shutdown();
    } catch (error) {
      console.error('Demo failed:', error);
    }
  }

  demo();
}
