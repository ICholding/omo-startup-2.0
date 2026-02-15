/**
 * HackerAI Agent Orchestrator
 * Core engine implementing the THINK-PLAN-EXECUTE-LEARN cycle
 * 
 * NON-NEGOTIABLE: Single cognitive architect, no multi-agent delegation
 */

const { v4: uuidv4 } = require('uuid');
const toolRegistry = require('./tool-registry');
const { EventEmitter } = require('events');

/**
 * Agent Operation Modes
 */
const AGENT_MODES = {
  RECON: 'recon',
  SCAN: 'scan',
  EXPLOIT: 'exploit',
  POST_EXPLOIT: 'post_exploit',
  LEARN: 'learn',
  SECURE: 'secure'
};

/**
 * Task Execution States
 */
const TASK_STATES = {
  PENDING: 'pending',
  THINKING: 'thinking',
  PLANNING: 'planning',
  EXECUTING: 'executing',
  LEARNING: 'learning',
  ADAPTING: 'adapting',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * HackerAI Cognitive Architect
 */
class HackerAIAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.agentId = options.agentId || `hackerai-${uuidv4().slice(0, 8)}`;
    this.model = options.model || 'claude-4-opus';
    this.mode = options.mode || AGENT_MODES.RECON;
    
    // Task storage
    this.tasks = new Map();
    
    // Memory system (collapse time through systems)
    this.memory = {
      findings: [],
      attackPaths: [],
      lessonsLearned: [],
      toolEffectiveness: {},
      maxItems: 100
    };
    
    // Metrics
    this.metrics = {
      tasksCompleted: 0,
      findingsDiscovered: 0,
      executionTimeTotal: 0,
      connectionErrors: 0,
      retryAttempts: 0
    };
    
    // Connection state
    this.connectionState = 'disconnected';
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
    
    // Request tracing
    this.requestLog = new Map();
    this.maxRequestLogSize = 1000;
    
    console.log(`[HackerAI] Cognitive Architect initialized: ${this.agentId}`);
  }

  /**
   * Set connection state with event emission
   */
  setConnectionState(state, metadata = {}) {
    const previousState = this.connectionState;
    this.connectionState = state;
    
    this.emit('connectionStateChange', {
      agentId: this.agentId,
      previous: previousState,
      current: state,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    
    if (state === 'error') {
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Log request for tracing
   */
  logRequest(requestId, data) {
    this.requestLog.set(requestId, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Trim log if exceeds max size
    if (this.requestLog.size > this.maxRequestLogSize) {
      const firstKey = this.requestLog.keys().next().value;
      this.requestLog.delete(firstKey);
    }
  }

  /**
   * Get request trace by ID
   */
  getRequestTrace(requestId) {
    return this.requestLog.get(requestId);
  }

  /**
   * Execute tool with retry logic
   */
  async executeToolWithRetry(step, requestId) {
    let lastError;
    let delay = this.retryConfig.retryDelay;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        this.logRequest(requestId, {
          type: 'toolExecution',
          tool: step.tool,
          attempt: attempt + 1,
          status: 'attempting'
        });
        
        const result = await this.executeTool(step);
        
        this.logRequest(requestId, {
          type: 'toolExecution',
          tool: step.tool,
          attempt: attempt + 1,
          status: 'success'
        });
        
        return result;
      } catch (error) {
        lastError = error;
        this.metrics.retryAttempts++;
        
        this.logRequest(requestId, {
          type: 'toolExecution',
          tool: step.tool,
          attempt: attempt + 1,
          status: 'failed',
          error: error.message
        });
        
        if (attempt < this.retryConfig.maxRetries) {
          console.warn(`[EXECUTE] Retry ${attempt + 1}/${this.retryConfig.maxRetries} for ${step.tool} after ${delay}ms`);
          await this.delay(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Utility: Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * THINK Phase: Strategic assessment
   */
  async think(task) {
    console.log(`[THINK] Analyzing task: ${task.id}`);
    task.state = TASK_STATES.THINKING;
    
    const analysis = {
      targetAssessment: this.assessTarget(task.target),
      attackVectors: this.identifyAttackVectors(task),
      riskProfile: this.calculateRiskProfile(task),
      recommendedApproach: this.selectMethodology(task),
      confidence: this.calculateConfidence(task)
    };
    
    task.thoughts.push({
      id: uuidv4(),
      phase: 'think',
      content: analysis,
      timestamp: new Date().toISOString()
    });
    
    return analysis;
  }

  /**
   * PLAN Phase: Execution strategy
   */
  async plan(task, analysis) {
    console.log(`[PLAN] Creating execution plan for: ${task.id}`);
    task.state = TASK_STATES.PLANNING;
    
    const plan = {
      id: uuidv4(),
      objective: task.description,
      mode: task.mode,
      steps: this.generateSteps(analysis, task.mode),
      estimatedDuration: this.estimateDuration(analysis),
      riskLevel: analysis.riskProfile.level,
      fallbackOptions: this.generateFallbacks(analysis)
    };
    
    task.plan = plan;
    return plan;
  }

  /**
   * EXECUTE Phase: Tool deployment with retry logic
   */
  async execute(task, plan) {
    console.log(`[EXECUTE] Running plan: ${plan.id}`);
    task.state = TASK_STATES.EXECUTING;
    this.setConnectionState('executing', { taskId: task.id });
    
    const results = [];
    const requestId = `req-${uuidv4().slice(0, 8)}`;
    
    this.logRequest(requestId, {
      type: 'taskExecution',
      taskId: task.id,
      steps: plan.steps.length,
      status: 'started'
    });
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      task.currentStep = i;
      
      console.log(`[EXECUTE] Step ${i + 1}/${plan.steps.length}: ${step.tool}`);
      
      try {
        const startTime = Date.now();
        // Use retry logic for tool execution
        const result = await this.executeToolWithRetry(step, requestId);
        const executionTime = Date.now() - startTime;
        
        results.push({
          step: i,
          tool: step.tool,
          result,
          executionTime,
          status: 'success'
        });
        
        // Update tool effectiveness
        this.updateToolEffectiveness(step.tool, executionTime, true);
        
        // Adaptive replanning if needed
        if (this.shouldReplan(result, step)) {
          console.log(`[ADAPT] Replanning triggered at step ${i}`);
          const newAnalysis = await this.think(task);
          const newPlan = await this.plan(task, newAnalysis);
          
          // Replace remaining steps
          plan.steps.splice(i + 1, plan.steps.length - i - 1, ...newPlan.steps);
        }
        
      } catch (error) {
        console.error(`[EXECUTE] Step failed after retries: ${error.message}`);
        this.setConnectionState('error', { 
          taskId: task.id, 
          step: i, 
          error: error.message 
        });
        
        results.push({
          step: i,
          tool: step.tool,
          error: error.message,
          status: 'failed',
          retries: this.retryConfig.maxRetries
        });
        
        this.updateToolEffectiveness(step.tool, 0, false);
        
        if (step.critical) {
          this.logRequest(requestId, {
            type: 'taskExecution',
            taskId: task.id,
            status: 'failed',
            error: error.message
          });
          throw new Error(`Critical step failed: ${step.tool} after ${this.retryConfig.maxRetries} retries`);
        }
      }
    }
    
    this.setConnectionState('completed', { taskId: task.id });
    this.logRequest(requestId, {
      type: 'taskExecution',
      taskId: task.id,
      status: 'completed',
      results: results.length
    });
    
    task.results = results;
    return results;
  }

  /**
   * LEARN Phase: Knowledge extraction
   */
  async learn(task) {
    console.log(`[LEARN] Extracting knowledge from: ${task.id}`);
    task.state = TASK_STATES.LEARNING;
    
    const findings = this.extractFindings(task);
    const patterns = this.identifyPatterns(findings);
    const recommendations = this.generateRecommendations(findings);
    
    task.findings = findings;
    task.patterns = patterns;
    task.recommendations = recommendations;
    
    // Update global memory
    this.updateMemory('findings', findings);
    this.updateMemory('lessons', {
      taskId: task.id,
      patterns,
      timestamp: new Date().toISOString()
    });
    
    // Update metrics
    this.metrics.findingsDiscovered += findings.length;
    
    return {
      findings,
      patterns,
      recommendations,
      riskScore: this.calculateRiskScore(findings)
    };
  }

  /**
   * Run complete task cycle
   */
  async runTask(description, target, mode = AGENT_MODES.RECON, options = {}) {
    const taskId = uuidv4();
    
    const task = {
      id: taskId,
      description,
      target,
      mode,
      options,
      state: TASK_STATES.PENDING,
      thoughts: [],
      plan: null,
      results: [],
      findings: [],
      currentStep: 0,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    
    this.tasks.set(taskId, task);
    
    console.log(`[TASK] Starting: ${taskId} (${mode})`);
    
    try {
      // THINK
      const analysis = await this.think(task);
      
      // PLAN
      const plan = await this.plan(task, analysis);
      
      // EXECUTE
      const results = await this.execute(task, plan);
      
      // LEARN
      const knowledge = await this.learn(task);
      
      task.state = TASK_STATES.COMPLETED;
      task.completedAt = new Date().toISOString();
      
      // Update metrics
      this.metrics.tasksCompleted++;
      this.metrics.executionTimeTotal += 
        new Date(task.completedAt) - new Date(task.createdAt);
      
      console.log(`[TASK] Completed: ${taskId}`);
      
      return {
        taskId,
        status: 'completed',
        findings: knowledge.findings,
        recommendations: knowledge.recommendations,
        riskScore: knowledge.riskScore,
        executionTime: this.metrics.executionTimeTotal
      };
      
    } catch (error) {
      task.state = TASK_STATES.FAILED;
      task.error = error.message;
      
      console.error(`[TASK] Failed: ${taskId} - ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Execute individual tool
   */
  async executeTool(step) {
    const tool = toolRegistry.getTool(step.tool);
    
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }
    
    return await tool.execute(step.parameters);
  }

  // Helper methods
  assessTarget(target) {
    return {
      type: this.inferTargetType(target),
      complexity: 'medium',
      knownServices: [],
      potentialVectors: []
    };
  }

  identifyAttackVectors(task) {
    const vectors = {
      [AGENT_MODES.RECON]: ['dns_enum', 'subdomain_scan', 'osint'],
      [AGENT_MODES.SCAN]: ['port_scan', 'service_enum', 'vuln_scan'],
      [AGENT_MODES.EXPLOIT]: ['sql_inject', 'xss', 'auth_bypass'],
      [AGENT_MODES.POST_EXPLOIT]: ['privesc', 'lateral_movement'],
      [AGENT_MODES.LEARN]: ['analysis', 'correlation'],
      [AGENT_MODES.SECURE]: ['remediation', 'hardening']
    };
    
    return vectors[task.mode] || vectors[AGENT_MODES.RECON];
  }

  calculateRiskProfile(task) {
    return {
      level: 'medium',
      factors: ['unauthorized_access', 'data_exposure'],
      mitigation: 'safe_payloads_only'
    };
  }

  selectMethodology(task) {
    return {
      type: 'systematic',
      phases: ['recon', 'scan', 'exploit_validation'],
      tools: this.identifyAttackVectors(task)
    };
  }

  calculateConfidence(task) {
    return 0.8;
  }

  generateSteps(analysis, mode) {
    const tools = this.identifyAttackVectors({ mode });
    
    return tools.map((tool, index) => ({
      step: index + 1,
      tool,
      parameters: {},
      description: `Execute ${tool}`,
      critical: index === 0,
      timeout: 300
    }));
  }

  estimateDuration(analysis) {
    return 300; // seconds
  }

  generateFallbacks(analysis) {
    return ['alternative_tools', 'reduced_scope', 'manual_analysis'];
  }

  shouldReplan(result, step) {
    return result?.unexpected === true || result?.requires_adaptation === true;
  }

  extractFindings(task) {
    return task.results
      .filter(r => r.status === 'success')
      .map(r => ({
        id: uuidv4(),
        tool: r.tool,
        data: r.result,
        timestamp: new Date().toISOString()
      }));
  }

  identifyPatterns(findings) {
    return ['pattern_1', 'pattern_2'];
  }

  generateRecommendations(findings) {
    return findings.map(f => ({
      findingId: f.id,
      action: 'review_and_remediate',
      priority: 'high'
    }));
  }

  calculateRiskScore(findings) {
    return findings.length * 10;
  }

  updateToolEffectiveness(tool, executionTime, success) {
    if (!this.memory.toolEffectiveness[tool]) {
      this.memory.toolEffectiveness[tool] = { runs: 0, successes: 0, avgTime: 0 };
    }
    
    const stats = this.memory.toolEffectiveness[tool];
    stats.runs++;
    if (success) stats.successes++;
    stats.avgTime = (stats.avgTime * (stats.runs - 1) + executionTime) / stats.runs;
  }

  updateMemory(type, data) {
    this.memory[type].push(data);
    
    // Trim if exceeds max
    if (this.memory[type].length > this.memory.maxItems) {
      this.memory[type] = this.memory[type].slice(-this.memory.maxItems);
    }
  }

  inferTargetType(target) {
    if (target.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return 'ip';
    if (target.includes('.')) return 'domain';
    return 'unknown';
  }

  getStatus() {
    return {
      agentId: this.agentId,
      model: this.model,
      mode: this.mode,
      connectionState: this.connectionState,
      activeTasks: Array.from(this.tasks.values()).filter(t => 
        t.state === TASK_STATES.EXECUTING
      ).length,
      totalTasks: this.tasks.size,
      metrics: this.metrics,
      memorySize: Object.values(this.memory).flat().length,
      requestLogSize: this.requestLog.size,
      retryConfig: this.retryConfig
    };
  }

  getTaskReport(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return { error: 'Task not found' };
    }
    
    return {
      taskId: task.id,
      description: task.description,
      target: task.target,
      mode: task.mode,
      state: task.state,
      duration: task.completedAt ? 
        new Date(task.completedAt) - new Date(task.createdAt) : null,
      thoughts: task.thoughts.length,
      stepsExecuted: task.results.length,
      findings: task.findings.length,
      recommendations: task.recommendations
    };
  }
}

module.exports = {
  HackerAIAgent,
  AGENT_MODES,
  TASK_STATES
};
