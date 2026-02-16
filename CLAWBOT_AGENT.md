# 🤖 ClawbotAgent - Comprehensive Autonomous Agent

A fully-featured autonomous agent with persistent memory, security, task automation, multi-channel communication, and system integrations.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClawbotAgent                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ PersistentMemory │  │ SecurityManager  │  │ TaskManager  │  │
│  │    System        │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  SystemIntegra-  │  │ Multi-Channel    │  │ Environment  │  │
│  │     tions        │  │ Communication    │  │  Awareness   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Self-Improvement │  │ B2 Cloud Storage │                    │
│  │     System       │  │                  │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───┴───┐            ┌────┴────┐           ┌────┴────┐
│ B2    │            │ GitHub  │           │Telegram │
│Cloud  │            │   API   │           │  Bot    │
└───────┘            └─────────┘           └─────────┘
```

---

## 🚀 Quick Start

```javascript
const ClawbotAgent = require('./agent/clawbot-agent');

// Initialize agent
const agent = new ClawbotAgent({
  b2Config: {
    keyId: process.env.B2_APPLICATION_KEY_ID,
    key: process.env.B2_APPLICATION_KEY,
    bucketName: 'omo-LLM'
  },
  encryptionKey: process.env.ENCRYPTION_KEY
});

async function main() {
  // Initialize all systems
  await agent.initialize();

  // Use the agent
  await agent.store('key', 'value', 'general');
  const value = await agent.retrieve('key');
  
  // Get status
  const status = await agent.getStatus();
  console.log(status);

  // Shutdown gracefully
  await agent.shutdown();
}

main();
```

---

## 📦 Core Components

### 1. Persistent Memory System

**Features:**
- B2 cloud storage with local caching
- Event logging
- Memory indexing for fast queries
- Type-based organization

```javascript
// Store data
await agent.store('user_preference', { theme: 'dark' }, 'general', {
  tags: ['user', 'preference'],
  userId: 'user_123'
});

// Retrieve data
const data = await agent.retrieve('user_preference');

// Query with filters
const results = await agent.query({
  type: 'general',
  after: Date.now() - 86400000, // Last 24 hours
  limit: 10
});

// Get event log
const events = agent.memorySystem.getEventLog({
  action: 'store',
  limit: 100
});
```

---

### 2. Security Manager

**Features:**
- AES-256-GCM encryption
- Role-based access control (RBAC)
- Multi-factor authentication support
- Comprehensive audit logging

```javascript
// Create users with roles
agent.securityLayer.createUser('admin', 'admin', { password: 'secure123' });
agent.securityLayer.createUser('dev1', 'developer', { password: 'devpass' });
agent.securityLayer.createUser('viewer1', 'viewer', { password: 'viewpass' });

// Authenticate
const auth = agent.securityLayer.authenticate('admin', 'secure123');
if (auth) {
  console.log(`Session: ${auth.sessionId}`);
}

// Authorize actions
const canExecute = agent.securityLayer.authorize(auth.sessionId, 'code.execute');
if (canExecute) {
  // Execute code
}

// Audit logging
agent.securityLayer.audit('code.execution', {
  userId: 'admin',
  command: 'deploy.sh'
});

// View audit log
const logs = agent.securityLayer.getAuditLog({
  action: 'code.execution',
  after: Date.now() - 86400000
});
```

**Roles:**
- `admin` - Full system access (`*`)
- `developer` - Code, file, git, memory operations
- `viewer` - Read-only access

---

### 3. Automated Task Manager

**Features:**
- Task scheduling (cron-like)
- Self-monitoring and recovery
- Task history tracking
- Event-driven architecture

```javascript
// Create tasks
const deployTask = agent.createTask('Deploy Production', 'command', {
  command: './deploy.sh production'
});

const backupTask = agent.createTask('Daily Backup', 'backup', {
  source: '/data',
  destination: 's3://backups/'
});

// Schedule tasks
agent.schedule(deployTask.id, '0 2 * * *'); // Daily at 2 AM
agent.schedule(backupTask.id, '0 0 * * *');  // Daily at midnight

// Execute immediately
await agent.executeTask(deployTask.id);

// Listen to events
agent.taskManager.on('task:completed', ({ task, result }) => {
  console.log(`Task ${task.name} completed!`);
});

agent.taskManager.on('task:failed', ({ task, error }) => {
  console.error(`Task ${task.name} failed:`, error);
});

// Get task history
const history = agent.taskManager.getTaskHistory({
  taskId: deployTask.id,
  status: 'completed'
});
```

**Task Types:**
- `command` - Execute shell commands
- `git` - Git operations
- `backup` - Backup operations
- `notification` - Send notifications

---

### 4. System Integrations

**Features:**
- GitHub API integration
- ICholding system connections
- Real-time monitoring
- Extensible architecture

```javascript
// GitHub operations
const repos = await agent.githubRequest('/user/repos');

// Create issue
await agent.githubRequest('/repos/ICholding/omo-startup-2.0/issues', 'POST', {
  title: 'Bug Report',
  body: 'Issue description'
});

// Trigger workflow
await agent.githubRequest(
  '/repos/ICholding/omo-startup-2.0/actions/workflows/deploy.yml/dispatches',
  'POST',
  { ref: 'main' }
);
```

---

### 5. Multi-Channel Communication

**Features:**
- Telegram, Slack, Email, Webhook support
- Natural Language Processing
- Message queuing and retry
- Context-aware responses

```javascript
const MultiChannelManager = require('./agent/multi-channel-communication');

const channels = new MultiChannelManager({
  telegram: { token: process.env.TELEGRAM_BOT_TOKEN },
  slack: { token: process.env.SLACK_BOT_TOKEN },
  email: {
    host: 'smtp.gmail.com',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

await channels.initialize();

// Send to specific channel
await channels.send('telegram', { text: 'Hello!' }, { chatId: '123456' });
await channels.send('slack', { text: 'Deployment complete' }, { channel: '#devops' });
await channels.send('email', {
  subject: 'Alert',
  text: 'System warning',
  html: '<h1>Warning</h1>'
}, { email: 'admin@icholding.com' });

// Broadcast to all channels
await channels.broadcast('🚀 Deployment started!');

// Process incoming messages
channels.on('message:received', async ({ channel, userId, text }) => {
  const processed = await channels.processIncoming(text, channel, { userId });
  
  // Send contextual response
  await channels.send(channel, { text: processed.response }, userId);
});

// Register webhook
const webhook = channels.getChannel('webhook');
webhook.registerWebhook('github', 'https://api.icholding.com/webhooks/github');
```

**NLP Processing:**
```javascript
const { NLPProcessor } = require('./agent/multi-channel-communication');

const nlp = new NLPProcessor();

const analysis = await nlp.process('Deploy to production', { userId: 'user_123' });
// Returns:
// {
//   intent: { name: 'deploy', action: 'deploy' },
//   confidence: 0.85,
//   entities: { urls: [], files: [] },
//   context: { history: [...] }
// }

const response = nlp.generateResponse(analysis);
// "I'll help you with deploy. Processing now..."
```

---

## 🔐 Security Best Practices

### Environment Variables
```bash
# B2 Cloud Storage
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_key

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your_secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password

# GitHub
GITHUB_TOKEN=ghp_your_token
```

### Encryption Example
```javascript
// The agent automatically encrypts sensitive data
const sensitiveData = { password: 'secret123' };
const encrypted = agent.securityLayer.encrypt(sensitiveData);
// Store encrypted in database

// Decrypt when needed
const decrypted = agent.securityLayer.decrypt(encrypted);
```

---

## 📊 Monitoring & Observability

### Agent Status
```javascript
const status = await agent.getStatus();

// Returns:
{
  sessionId: 'abc123',
  initialized: true,
  uptime: 86400000,
  memory: {
    totalMemories: 1000,
    totalSizeFormatted: '5.2 MB'
  },
  tasks: {
    total: 10,
    running: 3,
    history: 50
  },
  security: {
    users: 5,
    roles: 3,
    sessions: 2
  },
  connections: ['github', 'telegram', 'slack']
}
```

### Event Monitoring
```javascript
// Listen to all events
agent.on('initialized', () => console.log('Agent ready'));
agent.on('shutdown', () => console.log('Agent stopped'));

agent.taskManager.on('task:created', (task) => {
  console.log(`New task: ${task.name}`);
});

agent.memorySystem.b2Memory.on('sync', () => {
  console.log('Memory synced to cloud');
});
```

---

## 🎯 Use Cases

### 1. Automated Deployment Pipeline
```javascript
// Create deployment task
const deployTask = agent.createTask('Production Deploy', 'command', {
  command: './scripts/deploy.sh production'
});

// Schedule for 2 AM daily
agent.schedule(deployTask.id, '0 2 * * *');

// Notify on completion
agent.taskManager.on('task:completed', async ({ task }) => {
  if (task.name === 'Production Deploy') {
    await channels.broadcast(`✅ ${task.name} completed successfully!`);
  }
});
```

### 2. Security Monitoring
```javascript
// Audit all actions
agent.securityLayer.audit('security.check', { type: 'vulnerability_scan' });

// Alert on suspicious activity
agent.securityLayer.on('audit', (log) => {
  if (log.action === 'authentication' && !log.data.success) {
    channels.send('email', {
      subject: 'Security Alert: Failed Login',
      text: `Failed login attempt for user: ${log.data.userId}`
    }, { email: 'security@icholding.com' });
  }
});
```

### 3. Multi-Channel Support Bot
```javascript
channels.on('message:received', async ({ channel, userId, text }) => {
  // Process with NLP
  const analysis = await channels.processIncoming(text, channel, { userId });
  
  // Route to appropriate handler
  switch (analysis.intent?.name) {
    case 'deploy':
      await handleDeployRequest(userId, analysis);
      break;
    case 'status':
      const status = await agent.getStatus();
      await channels.send(channel, { text: formatStatus(status) }, userId);
      break;
    default:
      await channels.send(channel, { text: analysis.response }, userId);
  }
});
```

---

## 🔧 Configuration Options

```javascript
const agent = new ClawbotAgent({
  // B2 Cloud Storage
  b2Config: {
    keyId: process.env.B2_KEY_ID,
    key: process.env.B2_KEY,
    bucketName: 'omo-LLM',
    memoryFolder: 'clawbot-memory'
  },
  
  // Security
  encryptionKey: process.env.ENCRYPTION_KEY,
  
  // Multi-channel (set to false to disable)
  telegram: {
    token: process.env.TELEGRAM_TOKEN
  },
  slack: {
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SECRET
  },
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

---

## 📝 API Reference

### ClawbotAgent Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize all subsystems |
| `store(key, value, type, metadata)` | Store data |
| `retrieve(key)` | Retrieve data |
| `query(filters)` | Query memory |
| `createTask(name, type, config)` | Create task |
| `schedule(taskId, cron)` | Schedule task |
| `executeTask(taskId)` | Execute task |
| `authenticate(userId, password)` | Authenticate user |
| `authorize(sessionId, permission)` | Authorize action |
| `audit(action, data)` | Log audit event |
| `githubRequest(endpoint, method, data)` | GitHub API |
| `getStatus()` | Get agent status |
| `shutdown()` | Graceful shutdown |

---

## 🚀 Deployment

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000

CMD ["node", "agent/clawbot-agent.js"]
```

### Environment File
```bash
# .env
B2_APPLICATION_KEY_ID=xxx
B2_APPLICATION_KEY=xxx
ENCRYPTION_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
SLACK_BOT_TOKEN=xxx
GITHUB_TOKEN=xxx
```

---

## 📈 Future Enhancements

- [ ] Machine Learning for intent recognition
- [ ] Voice channel support (Twilio)
- [ ] Advanced analytics dashboard
- [ ] Plugin system for custom integrations
- [ ] Distributed agent clustering

---

**The ClawbotAgent is production-ready with enterprise-grade security, persistence, and automation capabilities!** 🤖🔒☁️
