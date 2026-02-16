/**
 * OpenClaw Agent Service
 * Lightweight AI agent with OpenRouter integration
 * Includes health checks and connection polling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'claude-3.5-sonnet';
const AGENT_ID = process.env.AGENT_ID || 'openclaw-agent';
const API_KEY = process.env.API_KEY || process.env.CLAWBOT_API_KEY; // For authentication

// Agent state
let agentState = {
  status: 'initializing',
  lastPing: Date.now(),
  connected: false,
  model: OPENROUTER_MODEL,
  provider: 'openrouter',
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Key authentication middleware
const authenticate = (req, res, next) => {
  if (!API_KEY) return next(); // No auth required if no key set
  
  const authHeader = req.headers.authorization;
  const providedKey = authHeader?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * Check OpenRouter connection
 */
async function checkOpenRouterConnection() {
  if (!OPENROUTER_API_KEY) {
    agentState.status = 'no_api_key';
    agentState.connected = false;
    return false;
  }

  try {
    const response = await axios.get(`${OPENROUTER_API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OMO_BACKEND_URL || 'https://omo-startup-backend.onrender.com',
        'X-Title': 'OMO OpenClaw Agent'
      },
      timeout: 10000
    });

    agentState.connected = true;
    agentState.status = 'online';
    agentState.lastPing = Date.now();
    return true;
  } catch (error) {
    agentState.connected = false;
    agentState.status = 'disconnected';
    agentState.errorCount++;
    console.error('[Agent] OpenRouter connection failed:', error.message);
    return false;
  }
}

/**
 * Poll connection status every 30 seconds
 */
setInterval(async () => {
  await checkOpenRouterConnection();
}, 30000);

// Initial connection check
checkOpenRouterConnection();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const uptime = Date.now() - agentState.startTime;
  res.json({
    status: agentState.status,
    healthy: agentState.connected,
    uptime: Math.floor(uptime / 1000),
    agent: {
      id: AGENT_ID,
      model: agentState.model,
      provider: agentState.provider,
      connected: agentState.connected
    },
    stats: {
      requests: agentState.requestCount,
      errors: agentState.errorCount
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Agent connection status (polling endpoint)
 */
app.get('/agent/status', authenticate, (req, res) => {
  res.json({
    id: AGENT_ID,
    status: agentState.status,
    connected: agentState.connected,
    lastPing: agentState.lastPing,
    model: agentState.model,
    provider: agentState.provider,
    timestamp: new Date().toISOString()
  });
});

/**
 * Poll agent connection (used by clients to check if agent is available)
 */
app.post('/agent/poll', authenticate, async (req, res) => {
  const isConnected = await checkOpenRouterConnection();
  
  res.json({
    connected: isConnected,
    status: agentState.status,
    model: agentState.model,
    timestamp: new Date().toISOString()
  });
});

/**
 * Main chat endpoint - proxies to OpenRouter
 */
app.post('/api/chat/message', authenticate, async (req, res) => {
  const { message, sessionId, context = [], from, username, channel } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!agentState.connected) {
    return res.status(503).json({ 
      error: 'Agent not connected to AI provider',
      status: agentState.status
    });
  }

  try {
    agentState.requestCount++;
    
    const requestId = uuidv4();
    
    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are ${AGENT_ID}, an AI assistant integrated with Telegram and other channels. ` +
                 `Be helpful, concise, and friendly. Current user: ${username || 'anonymous'} from ${channel || 'unknown'}.`
      },
      ...(context || []),
      { role: 'user', content: message }
    ];

    console.log(`[Agent] Request ${requestId}: ${message.slice(0, 50)}...`);

    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OMO_BACKEND_URL || 'https://omo-startup-backend.onrender.com',
          'X-Title': 'OMO OpenClaw Agent'
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    const aiResponse = response.data.choices?.[0]?.message?.content || 
                      response.data.choices?.[0]?.text ||
                      'I apologize, but I could not generate a response.';

    console.log(`[Agent] Response ${requestId}: ${aiResponse.slice(0, 50)}...`);

    res.json({
      message: aiResponse,
      requestId,
      model: OPENROUTER_MODEL,
      sessionId: sessionId || requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    agentState.errorCount++;
    console.error('[Agent] Chat error:', error.message);
    
    res.status(502).json({
      error: 'AI service error',
      message: error.message,
      details: error.response?.data
    });
  }
});

/**
 * Simple completion endpoint
 */
app.post('/api/complete', authenticate, async (req, res) => {
  const { prompt, system, max_tokens = 2000 } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const messages = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OMO_BACKEND_URL || 'https://omo-startup-backend.onrender.com',
          'X-Title': 'OMO OpenClaw Agent'
        },
        timeout: 120000
      }
    );

    res.json({
      completion: response.data.choices?.[0]?.message?.content,
      model: OPENROUTER_MODEL,
      usage: response.data.usage
    });

  } catch (error) {
    res.status(502).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'OMO OpenClaw Agent',
    version: '1.0.0',
    status: agentState.status,
    endpoints: {
      health: '/health',
      chat: '/api/chat/message (POST)',
      complete: '/api/complete (POST)',
      agentStatus: '/agent/status',
      agentPoll: '/agent/poll (POST)'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Agent] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Agent] ${AGENT_ID} listening on port ${PORT}`);
  console.log(`[Agent] Model: ${OPENROUTER_MODEL}`);
  console.log(`[Agent] Provider: OpenRouter`);
  console.log(`[Agent] API Key configured: ${OPENROUTER_API_KEY ? 'Yes' : 'No'}`);
});
