const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
require('dotenv').config();

const AgentRuntime = require('./lib/runtime');
const executionEngine = require('./lib/execution-engine');

const app = express();
const PORT = process.env.PORT || 10000;
const runtime = new AgentRuntime();

const frontendBuildCandidates = [
  process.env.FRONTEND_BUILD_PATH,
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, 'build'),
  path.join(__dirname, 'dist')
].filter(Boolean);

const FRONTEND_BUILD_PATH = frontendBuildCandidates.find((candidatePath) => existsSync(path.join(candidatePath, 'index.html')))
  || frontendBuildCandidates[0];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.options('*', cors());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy does not allow access from this origin'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  const status = await runtime.getStatus();
  res.json({
    status: status.healthy ? 'healthy' : 'degraded',
    provider: status.provider,
    openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
    moltbotUrl: process.env.MOLTBOT_URL || null,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/agent/status', async (req, res) => {
  res.json(await runtime.getStatus());
});

app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, sessionId, context = [] } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message and sessionId are required' });
    }

    const result = await runtime.execute({ message, sessionId, context });
    return res.json(result);
  } catch (error) {
    console.error('[API /api/chat/message] Moltbot execution failed', {
      provider: process.env.AGENT_PROVIDER || 'moltbot',
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      moltbotUrl: process.env.MOLTBOT_URL || null,
      message: error.message,
      stack: error.stack
    });
    return res.status(502).json({ error: error.message });
  }
});

const parseContext = (context, allowJsonString = false) => {
  if (Array.isArray(context)) {
    return context;
  }

  if (allowJsonString && typeof context === 'string' && context.trim()) {
    try {
      const parsed = JSON.parse(context);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const streamChatResponse = async (req, res, { message, sessionId, context }) => {
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runtime.execute({
      message,
      sessionId,
      context,
      onEvent: writeEvent
    });
    writeEvent('done', { ok: true });
  } catch (error) {
    console.error('[API /api/chat/stream] Moltbot execution failed', {
      provider: process.env.AGENT_PROVIDER || 'moltbot',
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      moltbotUrl: process.env.MOLTBOT_URL || null,
      message: error.message,
      stack: error.stack
    });
    writeEvent('execution-error', { error: error.message });
  }

  res.end();
};

app.get('/api/chat/stream', async (req, res) => {
  const { message, sessionId, context } = req.query;
  const parsedContext = parseContext(context, true);
  return streamChatResponse(req, res, {
    message,
    sessionId,
    context: parsedContext
  });
});

app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId, context } = req.body || {};
  const parsedContext = parseContext(context);
  return streamChatResponse(req, res, {
    message,
    sessionId,
    context: parsedContext
  });
});

app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId, context } = req.body || {};

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  const parsedContext = Array.isArray(context) ? context : [];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runtime.execute({
      message,
      sessionId,
      context: parsedContext,
      onEvent: writeEvent
    });
    writeEvent('done', { ok: true });
  } catch (error) {
    console.error('[API /api/chat/stream POST] Moltbot execution failed', {
      provider: process.env.AGENT_PROVIDER || 'moltbot',
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      moltbotUrl: process.env.MOLTBOT_URL || null,
      message: error.message,
      stack: error.stack
    });
    writeEvent('execution-error', { error: error.message });
  }

  res.end();
});

app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId, context } = req.body || {};

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  const parsedContext = Array.isArray(context) ? context : [];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runtime.execute({
      message,
      sessionId,
      context: parsedContext,
      onEvent: writeEvent
    });
    writeEvent('done', { ok: true });
  } catch (error) {
    console.error('[API /api/chat/stream] Moltbot execution failed', {
      provider: process.env.AGENT_PROVIDER || 'moltbot',
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      moltbotUrl: process.env.MOLTBOT_URL || null,
      message: error.message,
      stack: error.stack
    });
    writeEvent('execution-error', { error: error.message });
  }

  res.end();
});

app.get('/api/config/brand', (req, res) => {
  res.json({
    activeAgentId: process.env.AGENT_PROVIDER || 'moltbot',
    clientName: process.env.CLIENT_NAME || 'Default Client',
    industry: process.env.INDUSTRY || 'General'
  });
});

// NEW: Direct execution endpoint (integrated Moltbot)
app.post('/api/execute', async (req, res) => {
  const { task_type, command, parameters = {}, reason } = req.body || {};
  
  if (!task_type || !command) {
    return res.status(400).json({ 
      status: 'error', 
      error: 'Missing required fields: task_type, command' 
    });
  }
  
  try {
    const result = await executionEngine.execute({
      task_type,
      command,
      parameters,
      reason
    });
    
    res.json({
      status: result.status === 'success' ? 'completed' : 'error',
      task_type,
      reason,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API /api/execute] Execution failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message || 'Execution failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ========== TELEGRAM BOT ROUTES ==========
// Telegram integration - works independently without OpenClaw
const telegramRoutes = require('./src/routes/telegram');
const autonomyRoutes = require('./src/routes/autonomy');
app.use('/api/telegram', telegramRoutes);
app.use('/api/autonomy', autonomyRoutes);

console.log('✓ Telegram bot routes loaded');
console.log('✓ Autonomy routes loaded');

// ========== STATIC FILES & FALLBACK ==========

app.use(express.static(FRONTEND_BUILD_PATH));

app.use(async (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const indexPath = path.join(FRONTEND_BUILD_PATH, 'index.html');

  try {
    await fs.access(indexPath);
    return res.sendFile(indexPath);
  } catch {
    return res.status(503).json({ error: 'Frontend is unavailable' });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on 0.0.0.0:${PORT}`);
});

module.exports = { app, server };
