// backend/socket-handler.js
const { Server } = require('socket.io');
const { searchAndSynthesize, shouldSearchWeb } = require('./services/web-search');

/**
 * Socket.IO Handler
 * Clean UI: frontend only receives:
 * - typing-indicator (start/stop)
 * - response (final)
 */
class SocketHandler {
  constructor(server, hackerAI, toolRegistry) {
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    this.io = new Server(server, {
      transports: ['websocket', 'polling'],
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error('CORS policy does not allow access from this origin'));
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.hackerAI = hackerAI;
    this.toolRegistry = toolRegistry;
    this.activeSessions = new Map();

    this.setupEventHandlers();
    console.log('[Socket] Initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        this.activeSessions.set(socket.id, sessionId);

        socket.emit('session-joined', {
          sessionId,
          status: 'connected',
          timestamp: new Date().toISOString()
        });
      });

      socket.on('chat-message', async (data) => {
        const { message, sessionId, context = [] } = data || {};

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

        const normalizedMessage = message.trim();
        const modeContext = this.buildModeContext(normalizedMessage);

        // UI stays clean: only show pixel indicator while working.
        this.emitTyping(sessionId, true);

        try {
          const finalResponse = await this.generateFinalResponse({
            message: normalizedMessage,
            sessionId,
            context,
            modeContext
          });

          this.emitToSession(sessionId, 'response', {
            message: finalResponse,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.error('[Socket] chat-message error:', err);
          this.emitToSession(sessionId, 'tool-error', {
            error: err?.message || 'Failed to generate response',
            timestamp: new Date().toISOString()
          });
        } finally {
          this.emitTyping(sessionId, false);
        }
      });

      // Optional: tool execution channel (kept backend-only; do NOT stream to UI)
      socket.on('execute-tool', async (data) => {
        const sessionId = this.activeSessions.get(socket.id);
        if (!sessionId) return;

        try {
          const { toolName, params } = data || {};
          if (!toolName) throw new Error('Missing toolName');

          const tool = this.toolRegistry?.getTool?.(toolName);
          if (!tool) throw new Error(`Unknown tool: ${toolName}`);

          this.emitTyping(sessionId, true);
          await tool.execute(params); // backend runs it; no UI clutter
          this.emitTyping(sessionId, false);
        } catch (err) {
          this.emitTyping(sessionId, false);
          this.emitToSession(sessionId, 'tool-error', {
            error: err?.message || 'Tool execution failed',
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('disconnect', () => {
        const sessionId = this.activeSessions.get(socket.id);
        if (sessionId) this.activeSessions.delete(socket.id);
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }

  emitTyping(sessionId, isWorking) {
    this.emitToSession(sessionId, 'typing-indicator', {
      working: !!isWorking,
      timestamp: new Date().toISOString()
    });
  }

  emitToSession(sessionId, event, payload) {
    this.io.to(sessionId).emit(event, payload);
  }

  buildModeContext(message) {
    const mode = this.selectOperationalMode(message);
    const model = this.selectModelForMode(message, mode);
    return { mode, model };
  }

  selectOperationalMode(message) {
    const lower = String(message || '').toLowerCase();
    const executionTriggers = ['execute', 'run', 'deploy', 'mcp', 'server', 'tool', 'scan now', 'start task'];
    return executionTriggers.some((t) => lower.includes(t)) ? 'agent' : 'assistant';
  }

  selectModelForMode(_message, mode) {
    if (mode === 'agent') return process.env.AGENT_EXECUTION_MODEL || 'gpt-4.1';
    return process.env.ASSISTANT_MODEL || 'gpt-4';
  }

  async generateFinalResponse({ message, context, modeContext }) {
    // Optional: web search (backend only)
    let enrichedContext = Array.isArray(context) ? context : [];
    try {
      if (shouldSearchWeb?.(message)) {
        const web = await searchAndSynthesize(message);
        if (web?.summary) {
          enrichedContext = enrichedContext.concat([
            { role: 'system', content: `Web context (internal): ${web.summary}` }
          ]);
        }
      }
    } catch (e) {
      // ignore web failures; do not surface to UI
      console.warn('[Socket] web-search skipped/failed:', e?.message);
    }

    // Call your AI engine (keep it flexible)
    if (this.hackerAI?.generateHackerAIResponse) {
      return await this.hackerAI.generateHackerAIResponse(message, enrichedContext, modeContext);
    }

    if (this.hackerAI?.generateResponse) {
      return await this.hackerAI.generateResponse(message, enrichedContext, modeContext);
    }

    throw new Error('hackerAI generator not configured');
  }
}

module.exports = SocketHandler;
