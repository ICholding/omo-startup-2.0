const { Server } = require('socket.io');
const { searchAndSynthesize, shouldSearchWeb } = require('./services/web-search');
const { generateOpenRouterResponse, hasOpenRouterConfig } = require('./services/openrouter-client');
const { initializeFreshAgent } = require('./utils/agent-reset');

/**
 * Automation Assistant Socket.IO Handler
 * Shadow execution mode with summary + activity log payloads
 */
class SocketHandler {
  constructor(server, hackerAI, toolRegistry) {
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    
    console.log('[Socket.IO] CORS allowed origins:', allowedOrigins);

    this.io = new Server(server, {
      transports: ['websocket', 'polling'],
      pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS || 30000),
      pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS || 25000),
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) {
            console.log('[Socket.IO CORS] Allowing request with no origin');
            return callback(null, true);
          }
          
          // Allow if origins list is empty or origin is in the list
          if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            console.log('[Socket.IO CORS] Allowing origin:', origin);
            return callback(null, true);
          }
          
          console.error('[Socket.IO CORS] BLOCKED origin:', origin);
          console.error('[Socket.IO CORS] Expected one of:', allowedOrigins);
          return callback(new Error('CORS policy does not allow access from this origin'));
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.hackerAI = hackerAI;
    this.toolRegistry = toolRegistry;
    this.socketSessions = new Map();
    this.sessionMembers = new Map();
    this.sessionMemory = new Map();
    this.failedResponses = [];
    
    this.setupEventHandlers();
    
    console.log('[Socket] Real-time streaming initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      
      // Join session room
      socket.on('join-session', (sessionId) => {
        if (!sessionId || typeof sessionId !== 'string') {
          socket.emit('tool-error', {
            error: 'Missing or invalid sessionId',
            timestamp: new Date().toISOString()
          });
          return;
        }

        const membersInSession = this.sessionMembers.get(sessionId) || 0;
        const isNewSession = membersInSession === 0;

        const currentSession = this.socketSessions.get(socket.id);
        if (currentSession && currentSession !== sessionId) {
          const previousCount = this.sessionMembers.get(currentSession) || 1;
          this.sessionMembers.set(currentSession, Math.max(previousCount - 1, 0));
          socket.leave(currentSession);
        }

        socket.join(sessionId);
        this.socketSessions.set(socket.id, sessionId);
        this.sessionMembers.set(sessionId, membersInSession + 1);
        console.log(`[Socket] Client ${socket.id} joined session: ${sessionId} (new: ${isNewSession})`);
        
        // Reset agent to default automation state for new sessions
        if (isNewSession) {
          const agentConfig = initializeFreshAgent(sessionId);
          socket.emit('agent-reset', {
            sessionId,
            config: agentConfig,
            timestamp: new Date().toISOString()
          });
        }
        
        socket.emit('session-joined', {
          sessionId,
          status: 'connected',
          isNewSession,
          activeConnections: this.sessionMembers.get(sessionId),
          timestamp: new Date().toISOString()
        });
      });

      // Handle chat messages with streaming
      socket.on('chat-message', this.safeAsync(socket, async (data = {}) => {
        const { message, sessionId, context = [] } = data;

        if (!sessionId || typeof sessionId !== 'string') {
          socket.emit('tool-error', {
            error: 'Missing or invalid sessionId',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!message || typeof message !== 'string' || !message.trim()) {
          this.emitToSession(sessionId, 'tool-error', {
            error: 'Message content is required',
            timestamp: new Date().toISOString()
          });
          return;
        }

        console.log(`[Socket] Message from ${sessionId}: ${message}`);

        this.emitToSession(sessionId, 'execution-start', {
          state: 'THINKING',
          message: 'Thinking...',
          timestamp: new Date().toISOString()
        });

        await this.executeShadowResponse(message.trim(), sessionId, context);
      }));

      // Handle tool execution with live output
      socket.on('execute-tool', this.safeAsync(socket, async (data = {}) => {
        const { toolName, params, sessionId } = data;

        if (!sessionId || typeof sessionId !== 'string') {
          socket.emit('tool-error', {
            error: 'Missing or invalid sessionId',
            timestamp: new Date().toISOString()
          });
          return;
        }

        this.emitToSession(sessionId, 'tool-starting', {
          tool: toolName,
          params,
          timestamp: new Date().toISOString()
        });

        const tool = this.toolRegistry.getTool(toolName);
        if (!tool) {
          this.emitToSession(sessionId, 'tool-error', {
            tool: toolName,
            error: `Unknown tool: ${toolName}`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        const result = await tool.execute(params);
        this.emitToSession(sessionId, 'tool-complete', {
          tool: toolName,
          result,
          timestamp: new Date().toISOString()
        });
      }));

      // Handle disconnect
      socket.on('disconnect', () => {
        const sessionId = this.socketSessions.get(socket.id);
        if (sessionId) {
          this.socketSessions.delete(socket.id);
          const count = this.sessionMembers.get(sessionId) || 1;
          const nextCount = Math.max(count - 1, 0);
          if (nextCount === 0) {
            this.sessionMembers.delete(sessionId);
          } else {
            this.sessionMembers.set(sessionId, nextCount);
          }
        }
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }


  safeAsync(socket, handler) {
    return async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        this.handleSocketError(socket, error);
      }
    };
  }

  handleSocketError(socket, error) {
    console.error('[Socket] Handler error:', error);
    socket.emit('execution-error', {
      error: error?.message || 'Unexpected socket error',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Shadow Execution Protocol
   * Buffer backend processing and emit only final summary + activity package.
   */
  async executeShadowResponse(message, sessionId, context) {
    await this.applyThinkingDelay(message);

    const startedAt = Date.now();
    const memory = this.getSessionMemory(sessionId);
    const topic = this.detectConversationTopic(message, context, memory);
    const userState = this.detectUserState(message, context, memory);
    const responsePackage = await this.generateHackerAIResponse(message, context, { topic, userState, memory });

    this.recordSessionExchange(sessionId, {
      userMessage: message,
      assistantMessage: responsePackage.summary,
      topic,
      userState
    });

    const payload = {
      status: 'completed',
      summary: responsePackage.summary,
      sections: responsePackage.sections,
      activityLog: [
        {
          id: `log-${Date.now()}`,
          type: 'assistant.response',
          title: 'Generated automation response',
          detail: `Processed request with ${context.length} context messages in ${topic} mode while user is in ${userState} state.`,
          timestamp: new Date().toISOString(),
          severity: 'info',
          sessionId
        }
      ],
      artifacts: [],
      nextActions: responsePackage.nextActions || [],
      session: {
        currentSessionId: sessionId,
        changed: false,
        resetApplied: false,
        topic,
        userState,
        contextWindow: (this.sessionMemory.get(sessionId)?.history || []).length
      },
      errors: [],
      meta: {
        mode: 'shadow_execution',
        durationMs: Date.now() - startedAt,
        requestId: `req-${Date.now()}`,
        agentVersion: 'automation-assistant-v1',
        diagnostics: {
          contextMessages: context.length,
          sessionId,
          activeConnections: this.sessionMembers.get(sessionId) || 0,
          topic,
          userState
        }
      },
      timestamp: new Date().toISOString()
    };

    this.emitToSession(sessionId, 'execution-complete', payload);
  }

  getSessionMemory(sessionId) {
    if (!this.sessionMemory.has(sessionId)) {
      this.sessionMemory.set(sessionId, {
        history: [],
        lastTopic: 'general',
        lastState: 'initial'
      });
    }

    return this.sessionMemory.get(sessionId);
  }

  recordSessionExchange(sessionId, exchange) {
    const memory = this.getSessionMemory(sessionId);
    memory.history.push({ ...exchange, timestamp: new Date().toISOString() });

    if (memory.history.length > 12) {
      memory.history = memory.history.slice(-12);
    }

    memory.lastTopic = exchange.topic;
    memory.lastState = exchange.userState;
  }

  detectConversationTopic(message, context = [], memory = {}) {
    const normalized = message.toLowerCase();
    if (this.extractGithubUrl(message) || normalized.includes('repo')) return 'project-status';
    if (normalized.includes('error') || normalized.includes('bug') || normalized.includes('troubleshoot')) return 'troubleshooting';
    if (normalized.includes('how') || normalized.includes('what') || normalized.includes('why')) return 'specific-query';

    const lastTopicFromContext = [...context].reverse().find((entry) => entry?.topic)?.topic;
    return lastTopicFromContext || memory.lastTopic || 'general';
  }

  detectUserState(message, context = [], memory = {}) {
    const normalized = message.toLowerCase();
    if (normalized.includes('done') || normalized.includes('completed') || normalized.includes('worked')) return 'task-complete';
    if (normalized.includes('stuck') || normalized.includes('failed') || normalized.includes('not working')) return 'error-handling';
    if ((context?.length || 0) === 0 && (!memory.history || memory.history.length === 0)) return 'initial';
    if (normalized.includes('?')) return 'waiting-for-response';
    return 'active-task';
  }

  /**
   * Optional backend thinking delay for complex queries
   */
  async applyThinkingDelay(message) {
    const baseDelay = Number(process.env.THINKING_DELAY_MS || 250);
    const maxDelay = Number(process.env.THINKING_DELAY_MAX_MS || 2200);
    const normalized = message.toLowerCase();

    let multiplier = 1;
    if (normalized.length > 120) multiplier += 0.5;
    if (shouldSearchWeb(message)) multiplier += 1.25;
    if (normalized.includes('frontend') && normalized.includes('backend') && normalized.includes('connection')) multiplier += 0.5;

    const computedDelay = Math.min(Math.round(baseDelay * multiplier), maxDelay);
    if (computedDelay > 0) {
      await this.delay(computedDelay);
    }
  }

  /**
   * Stream internal reasoning thoughts
   */
  async streamReasoning(message, sessionId, context) {
    const thoughts = this.generateReasoning(message, context);
    
    // Emit reasoning start
    this.emitToSession(sessionId, 'reasoning-start', {
      state: 'REASONING',
      message: 'Processing request on backend cognition pipeline...',
      timestamp: new Date().toISOString()
    });

    // Stream reasoning chunks
    let accumulatedThoughts = '';
    
    for (const thought of thoughts) {
      await this.delay(50 + Math.random() * 100);
      accumulatedThoughts += thought + '\n';
      
      this.emitToSession(sessionId, 'reasoning-chunk', {
        chunk: thought,
        accumulated: accumulatedThoughts,
        isComplete: false,
        timestamp: new Date().toISOString()
      });
    }

    // Emit reasoning complete
    this.emitToSession(sessionId, 'reasoning-complete', {
      fullReasoning: accumulatedThoughts,
      isComplete: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stream final response after reasoning
   */
  async streamFinalResponse(message, sessionId, context) {
    const response = await this.generateHackerAIResponse(message, context);
    const chunks = this.splitIntoChunks(response);
    
    // Emit response start
    this.emitToSession(sessionId, 'response-start', {
      state: 'RESPONDING',
      message: 'Generating response...',
      timestamp: new Date().toISOString()
    });

    // Stream response chunks with typing effect
    let accumulatedResponse = '';
    
    for (const chunk of chunks) {
      await this.delay(20 + Math.random() * 40); // Slightly faster for final response
      accumulatedResponse += chunk;
      
      this.emitToSession(sessionId, 'response-chunk', {
        chunk,
        accumulated: accumulatedResponse,
        isComplete: false,
        timestamp: new Date().toISOString()
      });
    }

    // Emit completion
    this.emitToSession(sessionId, 'response-complete', {
      fullResponse: accumulatedResponse,
      isComplete: true,
      timestamp: new Date().toISOString()
    });

    // Emit learning state (follow-up suggestion)
    this.emitToSession(sessionId, 'agent-learning', {
      state: 'LEARNING',
      suggestion: this.generateFollowUp(message),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate internal reasoning thoughts (OpenClaw-style)
   * Merged: PR #28 codex/improve-agent-conversation-flow
   */
  generateReasoning(message, context) {
    const lowerMsg = message.toLowerCase();
    const thoughts = [];
    const githubUrl = this.extractGithubUrl(message);

    thoughts.push(`> Input analyzed (${context.length} prior messages in context)`);

    if (githubUrl) {
      thoughts.push('> Intent: Repository assistance');
      thoughts.push('> Action: Offer scan, dependency review, or file walkthrough choices');
    } else if (this.detectCommandIntent(message) === 'subfinder') {
      thoughts.push('> Intent: Command-style recon request');
      thoughts.push('> Action: Confirm domain format and authorization before execution');
    } else if (lowerMsg.includes('frontend') && lowerMsg.includes('backend') && lowerMsg.includes('connection')) {
      thoughts.push('> Intent: Frontend/backend integration debugging');
      thoughts.push('> Action: Validate socket events, CORS, and session flow before proposing fixes');
    } else if (lowerMsg.includes('scan') || lowerMsg.includes('check')) {
      thoughts.push('> Intent: Scanning request');
      thoughts.push('> Action: Offer default quick scan path with minimal required input');
    } else if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
      thoughts.push('> Intent: Capability discovery');
      thoughts.push('> Action: Provide concise defaults (scan/analyze/list/help)');
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      thoughts.push('> Intent: Greeting/Introduction');
      thoughts.push('> Action: Welcome and suggest repo URL or direct command');
    } else if (lowerMsg.includes('gpt') || lowerMsg.includes('model') || lowerMsg.includes('ai')) {
      thoughts.push('> Intent: Identity/Architecture inquiry');
      thoughts.push('> Action: Clarify security focus and repository analysis capabilities');
    } else {
      thoughts.push('> Intent: General conversation');
      thoughts.push('> Action: Ask one focused follow-up and avoid rigid command requirements');
    }

    thoughts.push(`> Confidence: ${this.assessConfidence(message)}%`);
    thoughts.push('> Ready to respond');

    return thoughts;
  }

  /**
   * Assess confidence level for intent detection
   */
  assessConfidence(message) {
    const lowerMsg = message.toLowerCase();
    if (this.extractGithubUrl(message)) return 95;
    if (this.detectCommandIntent(message) === 'subfinder') return 90;
    if (lowerMsg.includes('frontend') && lowerMsg.includes('backend') && lowerMsg.includes('connection')) return 92;
    if (lowerMsg.includes('scan') || lowerMsg.includes('check')) return 85;
    if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) return 85;
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) return 80;
    if (lowerMsg.includes('gpt') || lowerMsg.includes('model')) return 75;
    return 65;
  }

  /**
   * Split text into streaming chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    let i = 0;
    
    while (i < text.length) {
      // Variable chunk sizes for natural typing
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      chunks.push(text.slice(i, i + chunkSize));
      i += chunkSize;
    }
    
    return chunks;
  }

  /**
   * Legacy: Stream response with typing effect (deprecated, use streamResponse)
   */
  async streamResponseLegacy(message, sessionId, context) {
    const response = this.generateHackerAIResponse(message);
    const chunks = this.splitIntoChunks(response);
    
    // Emit planning state
    this.emitToSession(sessionId, 'agent-planning', {
      state: 'PLANNING',
      message: 'Formulating response...',
      timestamp: new Date().toISOString()
    });

    // Small delay for realism
    await this.delay(300);

    // Emit executing state
    this.emitToSession(sessionId, 'agent-executing', {
      state: 'EXECUTING',
      message: 'Generating response...',
      timestamp: new Date().toISOString()
    });

    // Stream chunks with typing effect
    let accumulatedResponse = '';
    
    for (const chunk of chunks) {
      await this.delay(30 + Math.random() * 50); // Random typing speed
      accumulatedResponse += chunk;
      
      this.emitToSession(sessionId, 'response-chunk', {
        chunk,
        accumulated: accumulatedResponse,
        isComplete: false,
        timestamp: new Date().toISOString()
      });
    }

    // Emit completion
    this.emitToSession(sessionId, 'response-complete', {
      fullResponse: accumulatedResponse,
      isComplete: true,
      timestamp: new Date().toISOString()
    });

    // Emit learning state (follow-up suggestion)
    this.emitToSession(sessionId, 'agent-learning', {
      state: 'LEARNING',
      suggestion: this.generateFollowUp(message),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate HackerAI contextual response
   * Merged: PR #28 codex/improve-agent-conversation-flow
   */
  async generateHackerAIResponse(message, context = [], conversation = {}) {
    const lowerMsg = message.toLowerCase();
    const githubUrl = this.extractGithubUrl(message);
    const commandIntent = this.detectCommandIntent(message);
    const previousTopic = conversation?.memory?.lastTopic;

    const contextualPrefix = previousTopic && previousTopic !== 'general'
      ? `Continuing from our ${previousTopic} thread: `
      : '';

    const webSearchResult = await searchAndSynthesize(message);

    if (webSearchResult?.summary) {
      return {
        summary: `${contextualPrefix}${webSearchResult.summary}`,
        sections: {
          'Project / Task Status': 'Live web synthesis completed for your latest request.',
          'Specific Query': webSearchResult.summary,
          'Troubleshooting Tips': 'If you want, I can validate these findings against your local repo next.'
        },
        nextActions: this.buildNextActions(message, conversation?.topic)
      };
    }

    if (hasOpenRouterConfig()) {
      try {
        const llmResponse = await generateOpenRouterResponse({ message, context });
        if (llmResponse) {
          return {
            summary: `${contextualPrefix}${llmResponse}`,
            sections: this.buildConversationSections(llmResponse, conversation?.topic),
            nextActions: this.buildNextActions(message, conversation?.topic)
          };
        }
      } catch (error) {
        this.failedResponses.push({
          source: 'openrouter',
          message,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.error('[OpenRouter] Falling back to local response:', error.message);
      }
    }

    if (githubUrl) {
      return this.composeResponse(
        `${contextualPrefix}I noticed a GitHub repository link: **${githubUrl}**.

I can start with a quick scan and then tailor deeper checks based on what you care about most.`,
        'project-status',
        [
          'List the project structure',
          'Review dependencies and supply-chain risk',
          'Run a security-oriented code review',
          'Summarize architecture and key modules'
        ]
      );
    }

    if (commandIntent === 'subfinder') {
      return this.composeResponse(
        `${contextualPrefix}I can help with that subdomain scan flow. Before running **subfinder**, please confirm the target domain (not a full URL) and that you have authorization.

Example: \`subfinder -d example.com\``,
        'specific-query',
        ['Share the target domain', 'Confirm authorization scope']
      );
    }
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return this.composeResponse(
        `${contextualPrefix}Hey! Great to chat with you — I can help with repository analysis, security scanning, or troubleshooting.

If you share a GitHub URL, I'll immediately suggest the best next actions.`,
        'general',
        ['Scan a repo', 'Troubleshoot an issue', 'Get architecture summary']
      );
    }
    
    if (lowerMsg.includes('gpt') || lowerMsg.includes('model') || lowerMsg.includes('ai')) {
      return this.composeResponse(
        `${contextualPrefix}I'm the Automation Assistant, focused on execution workflows, repository analysis, and practical outcomes.

Share a goal and I’ll respond with a clear summary and practical next steps.`,
        'specific-query'
      );
    }
    
    if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
      return this.composeResponse(
        `${contextualPrefix}Here are the default actions I can take for you:

- **Scan**: quick security and risk checks
- **Analyze**: architecture and code-path review
- **List**: file/module overview
- **Help**: explain commands and next best steps`,
        'specific-query',
        ['Run quick scan', 'Analyze architecture', 'List modules']
      );
    }
    
    if (lowerMsg.includes('frontend') && lowerMsg.includes('backend') && lowerMsg.includes('connection')) {
      return this.composeResponse(
        `${contextualPrefix}Great call — for frontend/backend connection issues, I can run this sequence:

1. Verify Socket.IO connection lifecycle (connect/join/respond)
2. Validate CORS rules between frontend origin and backend
3. Check event payload contracts (sessionId/message/context)
4. Confirm retry/error handling behavior`,
        'troubleshooting',
        ['Trace one failing request', 'Check CORS config first', 'Validate session payload contract']
      );
    }

    if (lowerMsg.includes('scan') || lowerMsg.includes('check') || lowerMsg.includes('target')) {
      return this.composeResponse(
        `${contextualPrefix}Got it — you want to run a scan.

Please share:
1. Target (domain, repo URL, or IP)
2. Scan type (quick, dependency, security deep-dive)

If you prefer, I can run a default quick scan first and then go deeper based on findings.`,
        'project-status',
        ['Provide target + scan type', 'Start default quick scan']
      );
    }
    
    // Default response
    return this.composeResponse(
      `${contextualPrefix}I understand your request. To keep this smooth, give me either:
- a **GitHub URL** to inspect, or
- a **direct command** like "scan <target>"

Then I'll suggest the best next actions automatically.`,
      conversation?.topic || 'general',
      this.buildNextActions(message, conversation?.topic)
    );
  }

  composeResponse(summary, topic = 'general', nextActions = []) {
    return {
      summary,
      sections: this.buildConversationSections(summary, topic),
      nextActions
    };
  }

  buildConversationSections(summary, topic = 'general') {
    return {
      'Project / Task Status': `Topic detected: ${topic}.`,
      'Specific Query': summary,
      'Troubleshooting Tips': 'If this misses your intent, tell me what outcome you want and I will adapt the path.'
    };
  }

  buildNextActions(message, topic = 'general') {
    const followUp = this.generateFollowUp(message);
    const topicActions = {
      'project-status': 'Ask for task status update',
      'specific-query': 'Ask a focused follow-up question',
      troubleshooting: 'Share error output for diagnosis',
      general: 'Describe your goal in one sentence'
    };

    return [followUp, topicActions[topic]].filter(Boolean);
  }

  /**
   * Generate follow-up suggestion
   */
  generateFollowUp(message) {
    const lowerMsg = message.toLowerCase();
    const githubUrl = this.extractGithubUrl(message);

    if (githubUrl) {
      return 'Try: "quick scan this repo" or "show project structure first"';
    }
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return 'Try: "scan example.com" or "check 192.168.1.1"';
    }
    if (lowerMsg.includes('frontend') && lowerMsg.includes('backend') && lowerMsg.includes('connection')) {
      return 'Try: "trace socket connection events for one request"';
    }
    if (lowerMsg.includes('scan') || lowerMsg.includes('check')) {
      return 'Provide a target domain or IP to begin scanning';
    }
    return 'Type /help to see available commands';
  }

  /**
   * Extract GitHub URL from message
   */
  extractGithubUrl(message) {
    const match = message.match(/https:\/\/github\.com\/[^\s]+/i);
    return match ? match[0] : null;
  }

  /**
   * Detect command intent from message
   */
  detectCommandIntent(message) {
    const trimmed = message.trim().toLowerCase();
    if (trimmed.startsWith('subfinder ')) return 'subfinder';
    return 'general';
  }

  /**
   * Emit event to specific session
   */
  emitToSession(sessionId, event, data) {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Utility: Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stream tool output in real-time
   */
  streamToolOutput(sessionId, toolName, output) {
    this.emitToSession(sessionId, 'tool-output', {
      tool: toolName,
      output,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = SocketHandler;
