/**
 * Telegram Autonomous Bridge
 * Connects Telegram bot to Enhanced Autonomous Agent
 * Removes all limitations mentioned in Telegram conversations
 */

const EnhancedAutonomousAgent = require('./enhanced-autonomous');
const VisualFeedback = require('./visual-feedback');

class TelegramAutonomousBridge {
  constructor(telegramBot) {
    this.bot = telegramBot;
    this.agent = new EnhancedAutonomousAgent();
    this.userSessions = new Map();
    this.initialized = false;
  }

  async initialize() {
    await this.agent.initialize();
    this.initialized = true;
    console.log('[TAB] Telegram Autonomous Bridge initialized');
  }

  async handleMessage(userId, message) {
    if (!this.initialized) await this.initialize();

    // Get or create user session
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        context: {},
        lastActive: Date.now()
      });
    }
    const session = this.userSessions.get(userId);

    // Show thinking indicator
    const thinkingMsg = VisualFeedback.thinking('Processing your request');
    console.log(`[TAB] ${thinkingMsg}`);

    // Parse intent from message
    const intent = this.parseIntent(message);

    // Process based on intent
    switch (intent.type) {
      case 'execute_code':
        return await this.handleCodeExecution(userId, intent.params);

      case 'execute_command':
        return await this.handleCommandExecution(userId, intent.params);

      case 'remember':
        return await this.handleRemember(userId, intent.params);

      case 'recall':
        return await this.handleRecall(userId, intent.params);

      case 'self_modify':
        return await this.handleSelfModify(userId, intent.params);

      case 'set_goal':
        return await this.handleSetGoal(userId, intent.params);

      case 'autonomous_task':
        return await this.handleAutonomousTask(userId, message);

      case 'status':
        return await this.handleStatus(userId);

      default:
        return await this.handleGeneralQuery(userId, message);
    }
  }

  parseIntent(message) {
    const lowerMsg = message.toLowerCase();

    // Code execution
    if (lowerMsg.match(/execute|run|code|script|program/i)) {
      const codeMatch = message.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        return {
          type: 'execute_code',
          params: {
            language: codeMatch[1] || 'javascript',
            code: codeMatch[2]
          }
        };
      }
    }

    // Command execution
    if (lowerMsg.match(/command|run\s+command|execute\s+command|bash|shell/i)) {
      const cmdMatch = message.match(/(?:command|bash|shell):?\s*`?([^`]+)`?/i);
      if (cmdMatch) {
        return {
          type: 'execute_command',
          params: { command: cmdMatch[1].trim() }
        };
      }
    }

    // Remember
    if (lowerMsg.match(/remember|save|store/i)) {
      const rememberMatch = message.match(/remember\s+(.+?)\s+(?:as|is|=)\s+(.+)/i);
      if (rememberMatch) {
        return {
          type: 'remember',
          params: {
            key: rememberMatch[1].trim(),
            value: rememberMatch[2].trim()
          }
        };
      }
    }

    // Recall
    if (lowerMsg.match(/recall|remember\s+what|what\s+did\s+i\s+say|get\s+memory/i)) {
      const recallMatch = message.match(/(?:recall|get)\s+(.+)/i);
      if (recallMatch) {
        return {
          type: 'recall',
          params: { key: recallMatch[1].trim() }
        };
      }
    }

    // Self modification
    if (lowerMsg.match(/modify|change\s+code|update\s+file|self\s*modify/i)) {
      return { type: 'self_modify', params: { raw: message } };
    }

    // Goal setting
    if (lowerMsg.match(/goal|objective|task|set\s+goal/i)) {
      const goalMatch = message.match(/(?:goal|set\s+goal):?\s+(.+)/i);
      if (goalMatch) {
        return {
          type: 'set_goal',
          params: { goal: goalMatch[1].trim() }
        };
      }
    }

    // Status check
    if (lowerMsg.match(/status|stats|info|about\s+you/i)) {
      return { type: 'status', params: {} };
    }

    // Autonomous task detection
    if (lowerMsg.match(/autonomous|auto|do\s+it|handle\s+this|take\s+care/i)) {
      return { type: 'autonomous_task', params: { raw: message } };
    }

    return { type: 'general', params: { message } };
  }

  async handleCodeExecution(userId, params) {
    const result = await this.agent.processAutonomousAction('execute_code', params);
    
    if (result.success) {
      return {
        text: VisualFeedback.codeExecution(params.language, 'success', result.output),
        parse_mode: 'Markdown'
      };
    } else {
      return {
        text: VisualFeedback.codeExecution(params.language, 'error', result.error),
        parse_mode: 'Markdown'
      };
    }
  }

  async handleCommandExecution(userId, params) {
    const result = await this.agent.processAutonomousAction('execute_command', params);
    
    if (result.success) {
      return {
        text: VisualFeedback.command(params.command, 'success', result.output),
        parse_mode: 'Markdown'
      };
    } else {
      return {
        text: VisualFeedback.command(params.command, 'error', result.error),
        parse_mode: 'Markdown'
      };
    }
  }

  async handleRemember(userId, params) {
    const result = await this.agent.processAutonomousAction('remember', params);
    
    if (result) {
      return {
        text: VisualFeedback.memory('saved', params.key, params.value),
        parse_mode: 'Markdown'
      };
    }
  }

  async handleRecall(userId, params) {
    const value = await this.agent.recall(params.key);
    
    if (value !== null) {
      return {
        text: VisualFeedback.memory('recalled', params.key, JSON.stringify(value)),
        parse_mode: 'Markdown'
      };
    } else {
      return {
        text: VisualFeedback.info(`I don't remember anything about "${params.key}"`, 'thinking')
      };
    }
  }

  async handleSelfModify(userId, params) {
    return {
      text: `⚠️ Self-modification requires explicit confirmation.\n\nPlease use format:\n\`modify file.js: replace "old" with "new"\``,
      parse_mode: 'Markdown'
    };
  }

  async handleSetGoal(userId, params) {
    const result = await this.agent.processAutonomousAction('set_goal', params);
    
    return {
      text: VisualFeedback.goal(result.description, 'in_progress', 0),
      parse_mode: 'Markdown'
    };
  }

  async handleAutonomousTask(userId, message) {
    // This is where the magic happens - the agent decides what to do
    const task = message.replace(/autonomous|auto|do it|handle this/i, '').trim();
    
    // Create a goal for this task
    const goal = await this.agent.setGoal(`Autonomous task: ${task}`, 8);
    
    // Analyze and decide actions
    const actions = await this.analyzeAndPlan(task);
    
    let response = VisualFeedback.autonomousTask(task, 'planning') + '\n\n';
    response += `${VisualFeedback.get('arrow')} **Planned Actions:**\n`;
    
    const actionList = actions.map((action, i) => ({
      name: action.description,
      done: false,
      inProgress: i === 0
    }));
    
    response += VisualFeedback.taskList(actionList);
    
    // Execute actions with progress updates
    const results = [];
    for (let i = 0; i < actions.length; i++) {
      // Update progress
      actionList[i].inProgress = true;
      
      const result = await this.executeAction(actions[i]);
      results.push(result);
      
      // Mark as done
      actionList[i].inProgress = false;
      actionList[i].done = result.success;
    }
    
    // Complete goal
    await this.agent.completeGoal(goal.id, { actions, results });
    
    response = VisualFeedback.autonomousTask(task, 'complete') + '\n\n';
    response += VisualFeedback.taskList(actionList) + '\n\n';
    response += VisualFeedback.success(`Results: ${results.filter(r => r.success).length}/${results.length} successful`);
    
    return { text: response, parse_mode: 'Markdown' };
  }

  async analyzeAndPlan(task) {
    // Simple planning logic - can be enhanced with AI
    const actions = [];
    
    if (task.match(/deploy|publish|release/i)) {
      actions.push({ type: 'command', description: 'Run deployment checks', command: 'git status' });
      actions.push({ type: 'command', description: 'Build project', command: 'npm run build' });
      actions.push({ type: 'command', description: 'Deploy', command: 'npm run deploy' });
    }
    
    if (task.match(/test|check|verify/i)) {
      actions.push({ type: 'command', description: 'Run tests', command: 'npm test' });
      actions.push({ type: 'command', description: 'Check linting', command: 'npm run lint' });
    }
    
    if (task.match(/update|upgrade/i)) {
      actions.push({ type: 'command', description: 'Check outdated packages', command: 'npm outdated' });
      actions.push({ type: 'command', description: 'Update packages', command: 'npm update' });
    }
    
    if (actions.length === 0) {
      actions.push({ type: 'remember', description: 'Store task for later', key: 'pending_task', value: task });
      actions.push({ type: 'command', description: 'List directory', command: 'ls -la' });
    }
    
    return actions;
  }

  async executeAction(action) {
    try {
      switch (action.type) {
        case 'command':
          return await this.agent.executeCommand(action.command);
        case 'code':
          return await this.agent.executeCode(action.code, action.language);
        case 'remember':
          return { success: await this.agent.remember(action.key, action.value) };
        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleStatus(userId) {
    const status = await this.agent.getStatus();
    
    let response = `${VisualFeedback.get('robot')} **Agent Status**\n\n`;
    response += `${VisualFeedback.get('info')} Session: \`${status.sessionId}\`\n`;
    response += `${status.initialized ? VisualFeedback.get('success') : VisualFeedback.get('error')} Initialized\n`;
    response += `${status.selfModificationEnabled ? VisualFeedback.get('success') : VisualFeedback.get('warning')} Self-Modification\n`;
    response += `${status.autoExecuteEnabled ? VisualFeedback.get('success') : VisualFeedback.get('warning')} Auto-Execute\n\n`;
    response += `${VisualFeedback.get('analyze')} **Statistics:**\n`;
    response += `${VisualFeedback.get('memory')} Memories: ${status.stats.memories}\n`;
    response += `${VisualFeedback.get('command')} Actions: ${status.stats.actions}\n`;
    response += `${VisualFeedback.get('lightbulb')} Patterns: ${status.stats.patterns}\n`;
    response += `${VisualFeedback.get('target')} Goals: ${status.stats.goals}\n\n`;
    response += `${VisualFeedback.get('file')} Memory: ${status.memoryPath}\n`;
    response += `${VisualFeedback.get('folder')} Workspace: ${status.workspacePath}`;
    
    return { text: response, parse_mode: 'Markdown' };
  }

  async handleGeneralQuery(userId, message) {
    // Use the enhanced agent's capabilities to provide better responses
    const recentMemories = await this.agent.recallByType('general', 5);
    
    let context = '';
    if (recentMemories.length > 0) {
      context = '\n\n🧠 Recent context:\n';
      recentMemories.forEach(m => {
        context += `• ${m.key}: ${JSON.stringify(m.value).substring(0, 50)}\n`;
      });
    }
    
    return {
      text: `🤖 I received your message: "${message}"\n\nI'm operating in **autonomous mode** with:\n• Persistent memory ✅\n• Code execution ✅\n• System access ✅\n• Self-modification ✅\n${context}\n\nType /help for available commands.`
    };
  }

  // Handle special commands
  async handleCommand(userId, command, args) {
    switch (command) {
      case '/help':
        return {
          text: `🤖 **Enhanced Autonomous Agent Commands**\n\n` +
                `🧠 **Memory**\n` +
                `• \`remember <key> as <value>\` - Store information\n` +
                `• \`recall <key>\` - Retrieve information\n\n` +
                `⚡ **Execution**\n` +
                `• Send code blocks (\\`\\`\\`js ... \\`\\`\\`) to execute\n` +
                `• \`command: <bash command>\` to run commands\n\n` +
                `🎯 **Goals**\n` +
                `• \`goal: <description>\` - Set a goal\n\n` +
                `🤖 **Autonomous**\n` +
                `• \`autonomous: <task>\` - Let me handle it\n\n` +
                `📊 **Info**\n` +
                `• \`/status\` - Show agent status\n` +
                `• \`/help\` - Show this help`,
          parse_mode: 'Markdown'
        };

      case '/status':
        return await this.handleStatus(userId);

      default:
        return { text: `Unknown command: ${command}. Type /help for available commands.` };
    }
  }
}

module.exports = TelegramAutonomousBridge;
