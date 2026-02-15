const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
require('dotenv').config();

const AgentRuntime = require('./lib/runtime');

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
    return res.status(502).json({ error: error.message });
  }
});

app.get('/api/chat/stream', async (req, res) => {
  const { message, sessionId, context } = req.query;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  let parsedContext = [];
  if (context) {
    try {
      parsedContext = JSON.parse(context);
    } catch {
      parsedContext = [];
    }
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
      context: parsedContext,
      onEvent: writeEvent
    });
    writeEvent('done', { ok: true });
  } catch (error) {
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on 0.0.0.0:${PORT}`);
});

module.exports = { app, server };
