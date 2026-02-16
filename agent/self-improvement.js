/**
 * Self-Improvement System
 * Autonomous enhancement based on user intent and performance
 * Enables the agent to evolve and optimize itself
 */

const VisualFeedback = require('./visual-feedback');
const fs = require('fs').promises;
const path = require('path');

class SelfImprovement {
  constructor(memory, awareness) {
    this.memory = memory;
    this.awareness = awareness;
    this.improvements = [];
    this.selfMetrics = {
      helpfulnessScore: 0.5,
      efficiencyScore: 0.5,
      reliabilityScore: 0.5,
      totalInteractions: 0,
      successfulResolutions: 0
    };
    this.initialized = false;
  }

  /**
   * Initialize self-improvement system
   */
  async initialize() {
    console.log(VisualFeedback.info('Initializing Self-Improvement System...', 'sparkles'));

    // Load previous metrics
    await this.loadMetrics();

    // Load improvement history
    await this.loadImprovementHistory();

    this.initialized = true;
    console.log(VisualFeedback.success('Self-Improvement System initialized'));
  }

  /**
   * Analyze user need and suggest optimal approach
   */
  async analyzeAndOptimize(userMessage, context = {}) {
    console.log(VisualFeedback.thinking('Analyzing user intent for optimal assistance'));

    const analysis = {
      intent: null,
      recommendedApproach: null,
      tools: [],
      workflow: null,
      enhancements: [],
      expectedOutcome: null
    };

    // Understand intent using awareness system
    analysis.intent = await this.awareness.understandIntent(userMessage);

    // Get relevant tools
    analysis.tools = this.selectOptimalTools(analysis.intent);

    // Design workflow
    analysis.workflow = this.designWorkflow(analysis.tools, analysis.intent);

    // Calculate expected outcome
    analysis.expectedOutcome = this.predictOutcome(analysis);

    // Suggest enhancements
    analysis.enhancements = await this.suggestEnhancements(analysis);

    // Apply auto-enhancements if confidence is high
    if (analysis.intent.confidence > 0.8) {
      await this.applyEnhancements(analysis.enhancements);
    }

    return analysis;
  }

  /**
   * Select optimal tools for intent
   */
  selectOptimalTools(intent) {
    const selected = [];

    // Start with matched tools from intent
    for (const toolInfo of (intent.tools || [])) {
      const tool = this.awareness.getTool(toolInfo.id);
      if (tool && tool.enabled !== false) {
        selected.push({
          ...tool,
          relevance: toolInfo.confidence,
          priority: this.calculatePriority(tool, intent)
        });
      }
    }

    // Add complementary tools based on category
    const categoryTools = this.getComplementaryTools(intent.category);
    for (const tool of categoryTools) {
      if (!selected.find(s => s.id === tool.id)) {
        selected.push({
          ...tool,
          relevance: 0.5,
          priority: 'medium'
        });
      }
    }

    // Sort by relevance and priority
    selected.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (b.relevance * priorityOrder[b.priority]) - 
             (a.relevance * priorityOrder[a.priority]);
    });

    return selected.slice(0, 5);
  }

  /**
   * Get complementary tools for category
   */
  getComplementaryTools(category) {
    const complementary = {
      execution: ['memory', 'file_ops'],
      storage: ['memory', 'file_ops'],
      version_control: ['file_ops', 'memory'],
      communication: ['memory'],
      cognition: ['memory', 'self_modify'],
      filesystem: ['memory', 'b2_storage']
    };

    const toolIds = complementary[category] || [];
    return toolIds.map(id => this.awareness.getTool(id)).filter(Boolean);
  }

  /**
   * Calculate tool priority
   */
  calculatePriority(tool, intent) {
    if (intent.confidence > 0.9) return 'high';
    if (tool.successRate > 0.9) return 'high';
    if (tool.safety === 'high') return 'low';
    return 'medium';
  }

  /**
   * Design optimal workflow
   */
  designWorkflow(tools, intent) {
    if (tools.length === 0) return null;

    const steps = [];

    // Step 1: Check memory for context
    steps.push({
      type: 'recall',
      description: 'Recall relevant context',
      tool: 'memory',
      optional: true
    });

    // Step 2: Main action steps
    for (const tool of tools) {
      steps.push({
        type: 'execute',
        description: tool.description,
        tool: tool.id,
        requiresConfirmation: tool.requiresConfirmation || false
      });
    }

    // Step 3: Store results
    steps.push({
      type: 'remember',
      description: 'Store results for future reference',
      tool: 'memory',
      optional: true
    });

    return {
      steps,
      estimatedDuration: this.estimateDuration(steps),
      riskLevel: this.calculateRisk(steps)
    };
  }

  /**
   * Estimate workflow duration
   */
  estimateDuration(steps) {
    let duration = 0;
    for (const step of steps) {
      const tool = this.awareness.getTool(step.tool);
      if (tool) {
        // Base duration per category
        const categoryDuration = {
          execution: 2000,
          storage: 3000,
          version_control: 4000,
          communication: 1000,
          cognition: 500,
          filesystem: 1000,
          meta: 5000
        };
        duration += categoryDuration[tool.category] || 1000;
      }
    }
    return duration;
  }

  /**
   * Calculate workflow risk level
   */
  calculateRisk(steps) {
    let riskScore = 0;
    
    for (const step of steps) {
      const tool = this.awareness.getTool(step.tool);
      if (tool) {
        const safetyScores = { low: 0, medium: 2, high: 5 };
        riskScore += safetyScores[tool.safety] || 0;
      }
    }

    if (riskScore === 0) return 'low';
    if (riskScore <= 3) return 'medium';
    return 'high';
  }

  /**
   * Predict outcome
   */
  predictOutcome(analysis) {
    const toolConfidence = analysis.tools.reduce((sum, t) => 
      sum + (t.successRate || 0.8), 0) / (analysis.tools.length || 1);

    const intentConfidence = analysis.intent.confidence;
    const overallConfidence = (toolConfidence + intentConfidence) / 2;

    return {
      successProbability: overallConfidence,
      estimatedTime: analysis.workflow?.estimatedDuration || 5000,
      quality: overallConfidence > 0.8 ? 'high' : overallConfidence > 0.5 ? 'medium' : 'low'
    };
  }

  /**
   * Suggest enhancements
   */
  async suggestEnhancements(analysis) {
    const enhancements = [];

    // Suggest missing tools
    const missingTools = this.findMissingTools(analysis);
    for (const toolId of missingTools) {
      const tool = this.awareness.getTool(toolId);
      if (tool && tool.enabled === false) {
        enhancements.push({
          type: 'enable_tool',
          toolId,
          reason: `Would improve ${analysis.intent.category} tasks`,
          impact: 'medium'
        });
      }
    }

    // Suggest workflow improvements
    if (analysis.tools.length > 2) {
      enhancements.push({
        type: 'workflow_optimization',
        description: 'Parallelize independent operations',
        impact: 'high'
      });
    }

    // Suggest learning
    if (analysis.intent.confidence < 0.7) {
      enhancements.push({
        type: 'improve_intent_recognition',
        description: 'Intent confidence is low - more examples needed',
        impact: 'high'
      });
    }

    return enhancements;
  }

  /**
   * Find missing but useful tools
   */
  findMissingTools(analysis) {
    const useful = {
      storage: ['b2_storage', 'memory'],
      execution: ['execute_code', 'execute_command', 'memory'],
      version_control: ['github_ops', 'file_ops'],
      communication: ['telegram', 'memory']
    };

    const categoryTools = useful[analysis.intent.category] || [];
    const usedToolIds = analysis.tools.map(t => t.id);

    return categoryTools.filter(id => !usedToolIds.includes(id));
  }

  /**
   * Apply enhancements
   */
  async applyEnhancements(enhancements) {
    const applied = [];

    for (const enhancement of enhancements) {
      try {
        switch (enhancement.type) {
          case 'enable_tool':
            await this.enableTool(enhancement.toolId);
            applied.push(enhancement);
            break;

          case 'workflow_optimization':
            // Mark for future optimization
            await this.memory.set(`optimization_${Date.now()}`, enhancement, 'meta');
            applied.push(enhancement);
            break;

          case 'improve_intent_recognition':
            // Log for training
            console.log(VisualFeedback.info('Logging for intent recognition improvement', 'lightbulb'));
            applied.push(enhancement);
            break;
        }
      } catch (error) {
        console.error(VisualFeedback.error(`Failed to apply enhancement`, error.message));
      }
    }

    if (applied.length > 0) {
      console.log(VisualFeedback.success(`Applied ${applied.length} enhancements`));
      this.improvements.push({
        timestamp: Date.now(),
        enhancements: applied
      });
    }

    return applied;
  }

  /**
   * Enable a tool
   */
  async enableTool(toolId) {
    const tool = this.awareness.getTool(toolId);
    if (!tool) return false;

    if (this.awareness.checkToolPrerequisites(tool)) {
      tool.enabled = true;
      console.log(VisualFeedback.success(`Enabled tool: ${tool.name}`));
      await this.memory.set(`tool_enabled_${toolId}`, {
        enabledAt: Date.now(),
        reason: 'Self-improvement'
      }, 'meta');
      return true;
    }

    return false;
  }

  /**
   * Record interaction outcome
   */
  async recordOutcome(interaction, success, userFeedback = null) {
    this.selfMetrics.totalInteractions++;

    if (success) {
      this.selfMetrics.successfulResolutions++;
    }

    // Update scores based on feedback
    if (userFeedback) {
      if (userFeedback.satisfied) {
        this.selfMetrics.helpfulnessScore = 
          (this.selfMetrics.helpfulnessScore * 0.9) + (0.1 * userFeedback.rating / 5);
      }
    }

    // Calculate efficiency
    const actualTime = interaction.actualDuration || interaction.expectedDuration;
    const expectedTime = interaction.expectedDuration || 5000;
    const efficiency = Math.min(expectedTime / Math.max(actualTime, 1), 1);
    this.selfMetrics.efficiencyScore = 
      (this.selfMetrics.efficiencyScore * 0.95) + (0.05 * efficiency);

    // Update reliability
    const reliability = this.selfMetrics.successfulResolutions / this.selfMetrics.totalInteractions;
    this.selfMetrics.reliabilityScore = reliability;

    // Store outcome
    await this.memory.set(`outcome_${Date.now()}`, {
      interaction,
      success,
      userFeedback,
      metrics: { ...this.selfMetrics }
    }, 'learning');

    // Save metrics
    await this.saveMetrics();
  }

  /**
   * Generate improvement plan
   */
  async generateImprovementPlan() {
    const plan = {
      currentState: { ...this.selfMetrics },
      goals: {
        helpfulness: 0.9,
        efficiency: 0.85,
        reliability: 0.95
      },
      actions: []
    };

    // Identify gaps
    if (this.selfMetrics.helpfulnessScore < plan.goals.helpfulness) {
      plan.actions.push({
        area: 'helpfulness',
        current: this.selfMetrics.helpfulnessScore,
        target: plan.goals.helpfulness,
        actions: [
          'Improve intent recognition',
          'Add more tool examples',
          'Better context awareness'
        ]
      });
    }

    if (this.selfMetrics.efficiencyScore < plan.goals.efficiency) {
      plan.actions.push({
        area: 'efficiency',
        current: this.selfMetrics.efficiencyScore,
        target: plan.goals.efficiency,
        actions: [
          'Cache frequently accessed data',
          'Parallelize operations',
          'Optimize workflows'
        ]
      });
    }

    if (this.selfMetrics.reliabilityScore < plan.goals.reliability) {
      plan.actions.push({
        area: 'reliability',
        current: this.selfMetrics.reliabilityScore,
        target: plan.goals.reliability,
        actions: [
          'Add error handling',
          'Implement retry logic',
          'Better validation'
        ]
      });
    }

    return plan;
  }

  /**
   * Auto-improve based on metrics
   */
  async autoImprove() {
    const plan = await this.generateImprovementPlan();
    const improvements = [];

    for (const action of plan.actions) {
      const gap = action.target - action.current;
      
      if (gap > 0.2) {
        // Significant gap - implement improvements
        switch (action.area) {
          case 'helpfulness':
            await this.improveHelpfulness();
            improvements.push('Enhanced intent recognition patterns');
            break;

          case 'efficiency':
            await this.improveEfficiency();
            improvements.push('Optimized caching and workflows');
            break;

          case 'reliability':
            await this.improveReliability();
            improvements.push('Added error handling and validation');
            break;
        }
      }
    }

    return improvements;
  }

  /**
   * Improve helpfulness
   */
  async improveHelpfulness() {
    // Analyze past interactions for intent patterns
    const interactions = await this.memory.getByType('learning', 100);
    
    // Extract common patterns
    const patterns = {};
    for (const entry of interactions) {
      const category = entry.value?.interaction?.intent?.category;
      if (category) {
        patterns[category] = (patterns[category] || 0) + 1;
      }
    }

    // Store insights
    await this.memory.set('intent_patterns', patterns, 'meta');
  }

  /**
   * Improve efficiency
   */
  async improveEfficiency() {
    // Optimize cache settings
    const cacheSettings = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      preloadKeys: ['tools', 'environment']
    };

    await this.memory.set('cache_settings', cacheSettings, 'config');
  }

  /**
   * Improve reliability
   */
  async improveReliability() {
    // Implement retry configuration
    const retryConfig = {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoff: 30000
    };

    await this.memory.set('retry_config', retryConfig, 'config');
  }

  /**
   * Load metrics
   */
  async loadMetrics() {
    const stored = await this.memory.get('self_metrics');
    if (stored) {
      this.selfMetrics = { ...this.selfMetrics, ...stored };
    }
  }

  /**
   * Save metrics
   */
  async saveMetrics() {
    await this.memory.set('self_metrics', this.selfMetrics, 'meta');
  }

  /**
   * Load improvement history
   */
  async loadImprovementHistory() {
    const history = await this.memory.get('improvement_history');
    if (history) {
      this.improvements = history;
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      metrics: this.selfMetrics,
      improvements: this.improvements.length,
      lastImprovement: this.improvements[this.improvements.length - 1]?.timestamp
    };
  }
}

module.exports = SelfImprovement;
