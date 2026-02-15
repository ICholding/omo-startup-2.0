const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const http = require('http');
require('dotenv').config();

// Determine frontend build path
const frontendBuildCandidates = [
  process.env.FRONTEND_BUILD_PATH,
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, 'build'),
  path.join(__dirname, 'dist')
].filter(Boolean);

const FRONTEND_BUILD_PATH = frontendBuildCandidates.find((candidatePath) => existsSync(path.join(candidatePath, 'index.html')))
  || frontendBuildCandidates[0];
const FRONTEND_BUILD_CANDIDATES = frontendBuildCandidates;

// Import HackerAI Agent Core
const { HackerAIAgent, AGENT_MODES } = require('./agent-core/agent-orchestrator');
const toolRegistry = require('./agent-core/tool-registry');
const SocketHandler = require('./socket-handler');

const app = express();
const PORT = process.env.PORT || 10000;
const backendLogFile = path.join(__dirname, 'backend-error-log.txt');

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const cspConnectSources = ["'self'", 'wss:', 'ws:', ...allowedOrigins];


const logEvent = async (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  const line = `${JSON.stringify(entry)}\n`;

  if (level === 'error') {
    console.error('[BackendLog]', message, meta);
  } else {
    console.log('[BackendLog]', message, meta);
  }

  try {
    await fs.appendFile(backendLogFile, line, 'utf8');
  } catch (writeError) {
    console.error('[BackendLog] Failed to write log file:', writeError.message);
  }
};

app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  req.requestId = requestId;

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'error' : 'info';

    logEvent(level, 'HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip
    });
  });

  next();
});

// Security middleware - Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: [...new Set(cspConnectSources)],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Initialize HackerAI Cognitive Architect
const hackerAI = new HackerAIAgent({
  agentId: process.env.AGENT_ID || 'hackerai-cognitive-architect',
  model: process.env.LLM_MODEL || 'claude-4-opus',
  mode: process.env.AGENT_MODE || 'recon'
});

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         HackerAI Cognitive Architect v1.0.0              ║');
console.log('║     Test - Hack - Learn - Secure                         ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`🧠 Agent ID: ${hackerAI.agentId}`);
console.log(`🤖 Model: ${hackerAI.model}`);
console.log(`🎯 Mode: ${hackerAI.mode}`);

// Middleware - Handle preflight requests for all routes
app.options('*', cors());

// Log CORS configuration for debugging
console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow if origins list is empty or origin is in the list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      console.log('[CORS] Allowing origin:', origin);
      return callback(null, true);
    }
    
    console.error('[CORS] BLOCKED origin:', origin);
    console.error('[CORS] Expected one of:', allowedOrigins);
    return callback(new Error('CORS policy does not allow access from this origin'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// CORS Test Endpoint - Verify CORS is working
app.get('/api/cors-test', (req, res) => {
  res.json({
    status: 'CORS working',
    origin: req.headers.origin || 'no origin',
    timestamp: new Date().toISOString()
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Root path health check - returns API status
// Note: Frontend SPA will be served via static file serving below
app.get('/api', (req, res) => {
  res.json({
    status: 'API is running',
    service: 'HackerAI Cognitive Architect',
    docs: '/api/health'
  });
});

// ═══════════════════════════════════════════════════════════
// HackerAI API Endpoints
// ═══════════════════════════════════════════════════════════

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HackerAI Cognitive Architect',
    version: '1.0.0',
    doctrine: 'THINK-PLAN-EXECUTE-LEARN-ADAPT-SECURE'
  });
});

/**
 * Get agent status
 */
app.get('/api/hackerai/status', (req, res) => {
  res.json({
    ...hackerAI.getStatus(),
    modes: Object.keys(AGENT_MODES),
    tools: toolRegistry.listTools()
  });
});

/**
 * Execute security task
 * Main endpoint for THINK-PLAN-EXECUTE-LEARN cycle
 */
app.post('/api/hackerai/execute', async (req, res) => {
  try {
    const { task, mode, options = {} } = req.body;
    
    if (!task || !task.description || !task.target) {
      return res.status(400).json({
        error: 'Invalid task. Required: description, target'
      });
    }
    
    const executionMode = mode || hackerAI.mode;
    
    console.log(`[API] Execute task: ${task.description}`);
    console.log(`[API] Target: ${task.target}`);
    console.log(`[API] Mode: ${executionMode}`);
    
    // Run task through cognitive architect
    const result = await hackerAI.runTask(
      task.description,
      task.target,
      executionMode,
      options
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[API] Execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get task status
 */
app.get('/api/hackerai/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const report = hackerAI.getTaskReport(taskId);
  
  if (report.error) {
    return res.status(404).json(report);
  }
  
  res.json(report);
});

/**
 * List all tasks
 */
app.get('/api/hackerai/tasks', (req, res) => {
  const tasks = Array.from(hackerAI.tasks.values()).map(task => ({
    id: task.id,
    description: task.description,
    target: task.target,
    mode: task.mode,
    state: task.state,
    createdAt: task.createdAt,
    findings: task.findings?.length || 0
  }));
  
  res.json({ tasks, total: tasks.length });
});

/**
 * Execute tool directly
 */
app.post('/api/hackerai/tool/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const params = req.body;
    
    const tool = toolRegistry.getTool(toolName);
    
    if (!tool) {
      return res.status(404).json({
        error: `Tool not found: ${toolName}`,
        availableTools: toolRegistry.listTools().map(t => t.name)
      });
    }
    
    console.log(`[API] Execute tool: ${toolName}`);
    const startTime = Date.now();
    const result = await tool.execute(params);
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      tool: toolName,
      result,
      executionTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[API] Tool execution failed:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List available tools
 */
app.get('/api/hackerai/tools', (req, res) => {
  res.json({
    tools: toolRegistry.listTools(),
    categories: ['recon', 'scan', 'exploit', 'learn', 'secure']
  });
});

// ═══════════════════════════════════════════════════════════
// Brand Configuration
// ═══════════════════════════════════════════════════════════

/**
 * Get brand configuration
 */
app.get('/api/config/brand', (req, res) => {
  const brandConfig = {
    activeAgentId: 'hackerai-cognitive-architect',
    activeMode: hackerAI.mode,
    clientName: process.env.CLIENT_NAME || 'HackerAI Security',
    industry: process.env.INDUSTRY || 'Cybersecurity',
    features: {
      fileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
      paperclipVisible: process.env.FEATURE_PAPERCLIP_VISIBLE !== 'false',
      intakeQuestions: process.env.FEATURE_INTAKE_QUESTIONS !== 'false',
      realTimeScanning: process.env.FEATURE_REALTIME_SCANNING !== 'false',
      exploitValidation: process.env.FEATURE_EXPLOIT_VALIDATION !== 'false',
      reportGeneration: process.env.FEATURE_REPORT_GENERATION !== 'false'
    },
    branding: {
      primaryColor: process.env.BRAND_PRIMARY_COLOR || '#00FF41',
      secondaryColor: process.env.BRAND_SECONDARY_COLOR || '#0D1117',
      accentColor: process.env.BRAND_ACCENT_COLOR || '#F85149',
      companyName: process.env.BRAND_COMPANY_NAME || 'HackerAI',
      tagline: 'Test. Hack. Learn. Secure.'
    },
    cognition: {
      model: hackerAI.model,
      thinkingDepth: 'deep',
      leverageOptimization: true,
      autoReplanning: true
    }
  };
  
  res.json(brandConfig);
});

/**
 * Storage connection status
 */
app.get('/api/storage/status', (req, res) => {
  const keyId = process.env.BACKBLAZE_KEY_ID || process.env.VITE_BACKBLAZE_KEY_ID;
  const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY || process.env.VITE_BACKBLAZE_APPLICATION_KEY;
  const bucketId = process.env.BACKBLAZE_BUCKET_ID || process.env.VITE_BACKBLAZE_BUCKET_ID;
  const bucketName = process.env.BACKBLAZE_BUCKET_NAME || process.env.VITE_BACKBLAZE_BUCKET_NAME;

  const configured = Boolean(keyId && applicationKey && (bucketId || bucketName));

  res.json({
    storage: {
      provider: 'backblaze-b2',
      configured,
      mode: configured ? 'cloud' : 'local-fallback'
    },
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════
// Admin Endpoints
// ═══════════════════════════════════════════════════════════

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!process.env.ADMIN_ENABLED || process.env.ADMIN_ENABLED === 'false') {
    return res.status(403).json({ error: 'Admin access disabled' });
  }
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  
  if (username === validUsername && password === validPassword) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

app.get('/api/admin/customization', authenticateAdmin, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'customization-config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      res.json(JSON.parse(configData));
    } catch (err) {
      res.json({
        theme: {
          primaryColor: '#00FF41',
          secondaryColor: '#0D1117',
          accentColor: '#F85149',
          backgroundColor: '#0D1117',
          textColor: '#C9D1D9'
        },
        chat: {
          bubbleStyle: 'rounded',
          fontSize: 'medium',
          showTimestamps: true,
          enableMarkdown: true
        },
        features: {
          fileUpload: true,
          codeHighlighting: true
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load customization' });
  }
});

app.post('/api/admin/customization', authenticateAdmin, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'customization-config.json');
    const configData = JSON.stringify(req.body, null, 2);
    
    await fs.writeFile(configPath, configData, 'utf8');
    
    res.json({
      success: true,
      message: 'Customization saved',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save customization' });
  }
});

// ═══════════════════════════════════════════════════════════
// Legacy API Compatibility
// ═══════════════════════════════════════════════════════════

/**
 * Legacy chat endpoint - redirected to HackerAI
 */
app.post('/api/chat/message', async (req, res) => {
  const { message, agentId, context } = req.body;
  
  console.log('[API] Chat message received:', message);
  
  try {
    // Run through HackerAI Cognitive Architect
    const result = await hackerAI.runTask(
      message,
      'conversation',
      'learn',
      { context: context || [] }
    );
    
    // Format response
    let responseText = '';
    
    if (result.findings && result.findings.length > 0) {
      // If we have findings, format them
      responseText = `**Analysis Complete**\n\n`;
      responseText += result.findings.map((f, i) => `${i + 1}. ${JSON.stringify(f.data)}`).join('\n');
    } else {
      // Generate contextual response based on message type
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        responseText = `**Greetings.**\n\nI am the HackerAI Cognitive Architect. I operate on the THINK-PLAN-EXECUTE-LEARN cycle.\n\n**Current Mode:** ${hackerAI.mode.toUpperCase()}\n**Available Operations:**\n• Reconnaissance (recon)\n• Scanning (scan)\n• Exploitation (exploit)\n• Analysis (learn)\n• Hardening (secure)\n\nWhat would you like to test or secure?`;
      } else if (lowerMsg.includes('gpt') || lowerMsg.includes('model') || lowerMsg.includes('ai')) {
        responseText = `**System Identification**\n\nI am not a GPT model. I am the **HackerAI Cognitive Architect** - a specialized security automation engine.\n\n**Architecture:**\n• Model: ${hackerAI.model}\n• Framework: HackerAI Agent-Core v1.0\n• Execution Cycle: THINK-PLAN-EXECUTE-LEARN-ADAPT-SECURE\n• Purpose: Asymmetric security outcomes through systematic testing\n\nI deploy tools for reconnaissance, vulnerability scanning, and security validation. Not chat. Execution.`;
      } else if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
        responseText = `**Operational Capabilities**\n\nI execute security workflows through six operational modes:\n\n1. **RECON** - DNS enumeration, subdomain discovery, OSINT gathering\n2. **SCAN** - Port scanning, service enumeration, vulnerability detection\n3. **EXPLOIT** - Safe proof-of-concept validation (authorized targets only)\n4. **POST_EXPLOIT** - Lateral movement analysis, privilege escalation checks\n5. **LEARN** - Findings correlation, risk scoring, pattern recognition\n6. **SECURE** - Remediation planning, configuration hardening\n\n**Commands:**\n• "/mode recon" - Switch to reconnaissance mode\n• "/status" - Check agent status and metrics\n• "/tools" - List available security tools\n• Target domain/IP - Begin assessment\n\nWhat is your target?`;
      } else if (lowerMsg.includes('status')) {
        const status = hackerAI.getStatus();
        responseText = `**HackerAI Status Report**\n\n🧠 **Agent ID:** ${status.agentId}\n🎯 **Current Mode:** ${status.mode}\n🤖 **Model:** ${status.model}\n\n📊 **Metrics:**\n• Tasks Completed: ${status.metrics.tasksCompleted}\n• Findings Discovered: ${status.metrics.findingsDiscovered}\n• Active Tasks: ${status.activeTasks}\n• Memory Items: ${status.memorySize}\n\nUse "/tools" to see available security tools.`;
      } else if (lowerMsg.includes('tool') || lowerMsg.includes('scan') || lowerMsg.includes('check')) {
        const tools = toolRegistry.listTools();
        responseText = `**Available Security Tools**\n\n`;
        responseText += tools.map(t => `• **${t.name}** (${t.category}) - ${t.description}`).join('\n');
        responseText += `\n\nTo execute a tool, use: "/tool [tool-name] [target]"`;
      } else {
        // Default HackerAI response
        responseText = `**Message Received**\n\nInput: "${message}"\n\nI am the HackerAI Cognitive Architect, not a conversational chatbot. My purpose is systematic security testing through the THINK-PLAN-EXECUTE-LEARN cycle.\n\n**To proceed, specify:**\n1. **Target** (domain, IP, or URL)\n2. **Mode** (recon, scan, exploit, learn, secure)\n3. **Objective** (what you want to test or verify)\n\nOr type "/help" for operational capabilities.`;
      }
    }
    
    res.json({
      response: responseText,
      agent: 'hackerai-cognitive-architect',
      mode: hackerAI.mode,
      taskId: result.taskId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Chat processing failed:', error);
    res.status(500).json({
      response: `**Execution Error:** ${error.message}`,
      agent: 'hackerai-cognitive-architect',
      error: true,
      timestamp: new Date().toISOString()
    });
  }
});

// ═══════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Static File Serving & SPA Fallback
// ═══════════════════════════════════════════════════════════

// Serve static files from frontend build directory
app.use(express.static(FRONTEND_BUILD_PATH));

// SPA fallback: Serve index.html for any non-API GET routes
app.use(async (req, res, next) => {
  // Don't interfere with API routes
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const indexPath = path.join(FRONTEND_BUILD_PATH, 'index.html');

  try {
    await fs.access(indexPath);
    return res.sendFile(indexPath);
  } catch (error) {
    await logEvent('error', 'SPA fallback failed: index.html missing', {
      requestId: req.requestId,
      indexPath,
      error: error.message
    });
    return res.status(503).json({
      error: 'Frontend is unavailable',
      requestId: req.requestId
    });
  }
});

// Error handling (for API routes)
app.use((err, req, res, next) => {
  logEvent('error', 'Unhandled server error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const checkBackendConnection = async () => {
  const statusUrl = process.env.BACKEND_STATUS_URL;

  if (!statusUrl) return;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.BACKEND_STATUS_TIMEOUT_MS || 5000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    await logEvent('info', 'Backend dependency connectivity check passed', {
      statusUrl,
      statusCode: response.status
    });
  } catch (error) {
    await logEvent('error', 'Unable to reach backend dependency', {
      statusUrl,
      error: error.message
    });
  } finally {
    clearTimeout(timeout);
  }
};

setInterval(checkBackendConnection, Number(process.env.BACKEND_STATUS_INTERVAL_MS || 60000));
checkBackendConnection();

// Create HTTP server for Socket.IO integration
const server = http.createServer(app);

// Initialize Socket.IO handler
const socketHandler = new SocketHandler(server, hackerAI, toolRegistry);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ SERVER STARTED SUCCESSFULLY - v1.0.1 (SPA Fix Applied)`);
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🧠 Agent: ${hackerAI.agentId}`);
  console.log(`🎯 Active Mode: ${hackerAI.mode}`);
  console.log(`\n📁 Static files: ${FRONTEND_BUILD_PATH}`);
  console.log(`📁 Static path candidates: ${FRONTEND_BUILD_CANDIDATES.join(', ')}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/hackerai/status`);
  console.log(`   POST /api/hackerai/execute`);
  console.log(`   GET  /api/hackerai/task/:id`);
  console.log(`   GET  /api/hackerai/tools`);
  console.log(`   GET  /api/config/brand`);
  console.log(`\n🌐 Frontend Routes (SPA Fallback Enabled):`);
  console.log(`   GET  /          → DemoLogin`);
  console.log(`   GET  /chat      → ChatInterface`);
  console.log(`   GET  *          → index.html (SPA fallback)`);
  console.log(`\n🔌 WebSocket Events:`);
  console.log(`   join-session, chat-message, execute-tool`);
  console.log(`   agent-thinking, agent-response, tool-output`);
  console.log(`\n💡 Deployment timestamp: ${new Date().toISOString()}`);
});

module.exports = { app, server, socketHandler };
