# 🤖 Super Autonomous Agent

A fully self-aware agent with **B2 cloud memory**, **environment awareness**, and **continuous self-improvement** capabilities.

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| ☁️ **B2 Cloud Memory** | Persistent memory backed by Backblaze B2 cloud storage |
| 🧠 **Self-Awareness** | Knows its tools, capabilities, and environment |
| 🔄 **Self-Improvement** | Learns from interactions and auto-optimizes |
| 🎯 **Intent-Optimized** | Selects best approach for each user request |
| 🪣 **B2 Storage** | Direct file upload/download to cloud |

---

## 📦 Modules

### 1. B2 Memory (`b2-memory.js`)
Cloud-first memory system with local caching.

```javascript
const B2Memory = require('./b2-memory');

const memory = new B2Memory({
  memoryFolder: 'omo-agent-memory',  // B2 folder for memories
  syncInterval: 30000,                // Sync every 30 seconds
  keyId: process.env.B2_APPLICATION_KEY_ID,
  key: process.env.B2_APPLICATION_KEY,
  bucketName: 'omo-LLM'
});

await memory.initialize();

// Store memory
await memory.set('user_preference', { theme: 'dark' }, 'general');

// Recall memory
const pref = await memory.get('user_preference');

// Search memories
const results = await memory.search('preference');
```

**Features:**
- Automatic background sync to B2
- Local cache for fast access
- Memory types: `general`, `critical`, `directive`, `meta`, `learning`, `history`
- Search and filter capabilities
- Export/import functionality

---

### 2. Environment Awareness (`environment-awareness.js`)
Self-aware system that knows tools and environment.

```javascript
const EnvironmentAwareness = require('./environment-awareness');

const awareness = new EnvironmentAwareness();
await awareness.initialize();

// Get available tools
const tools = awareness.getAvailableTools();

// Understand user intent
const intent = await awareness.understandIntent('Upload file to cloud');
// Returns: { category: 'storage', confidence: 0.85, tools: [...] }

// Generate self-report
const report = await awareness.generateSelfReport();
```

**Built-in Tools (9):**
1. `execute_code` - Execute code in multiple languages
2. `execute_command` - Run system commands
3. `b2_storage` - Cloud file operations
4. `github_ops` - GitHub repository management
5. `memory` - Persistent memory operations
6. `telegram` - Telegram bot interactions
7. `file_ops` - File system operations
8. `web_search` - Internet search
9. `self_modify` - Self-improvement and modification

---

### 3. Self-Improvement (`self-improvement.js`)
Continuous learning and optimization system.

```javascript
const SelfImprovement = require('./self-improvement');

const improvement = new SelfImprovement(memory, awareness);
await improvement.initialize();

// Analyze and optimize for user request
const analysis = await improvement.analyzeAndOptimize('Deploy to production');

// Record outcome
await improvement.recordOutcome(
  { expectedDuration: 5000, actualDuration: 3000 },
  true,  // success
  { satisfied: true, rating: 5 }  // user feedback
);

// Auto-improve
const improvements = await improvement.autoImprove();
```

**Metrics Tracked:**
- Helpfulness Score (target: 0.9)
- Efficiency Score (target: 0.85)
- Reliability Score (target: 0.95)

---

### 4. Super Agent (`super-agent.js`)
Complete integrated agent with all capabilities.

```javascript
const SuperAgent = require('./super-agent');

const agent = new SuperAgent({
  b2Config: {
    keyId: process.env.B2_APPLICATION_KEY_ID,
    key: process.env.B2_APPLICATION_KEY,
    bucketName: 'omo-LLM'
  }
});

// Initialize
await agent.initialize();

// Process request with full awareness
const result = await agent.processRequest('Show my cloud files');

// Upload to cloud
await agent.uploadToCloud('/path/to/file.zip', 'backups/file.zip');

// Download from cloud
await agent.downloadFromCloud('backups/file.zip', '/local/file.zip');

// Get comprehensive status
const status = await agent.getStatus();

// Generate self-report
const report = await agent.generateSelfReport();

// Graceful shutdown
await agent.shutdown();
```

---

## 🚀 Quick Start

### Environment Variables
```bash
# B2 Cloud Storage
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_key
B2_BUCKET_NAME=omo-LLM

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=ICholding

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
```

### Basic Usage
```javascript
const SuperAgent = require('./agent/super-agent');

async function main() {
  const agent = new SuperAgent();
  await agent.initialize();

  // Process any request
  const result = await agent.processRequest('What tools do you have?');
  console.log(result.text);

  await agent.shutdown();
}

main();
```

---

## 📊 Visual Feedback

The agent provides visual feedback with emojis:

```
🚀 Initializing Super Autonomous Agent...
ℹ️ Session ID: lxxxxxx
☁️ Initializing B2 Cloud Memory...
✅ B2 Cloud Memory initialized
  Cached 0 memories
🧠 Initializing Environment Awareness...
✅ Environment Awareness initialized
  Detected 9 tools, 0 capabilities
✨ Initializing Self-Improvement System...
✅ Self-Improvement System initialized
✅ Agent lxxxxxx initialized with autonomous capabilities

🤔 Processing: "Show me status"
💡 Intent: cognition (92.3% confidence)
🎯 Plan: 4 steps, Risk: low
ℹ️ Starting workflow lxxxxxx...
⏳ Step 1/4 - Load relevant context from memory
⏳ Step 2/4 - Execute Environment Awareness
✅ Task completed in 150ms
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Super Agent                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   B2 Memory  │  │  Environment │  │ Self-Improve │      │
│  │  ☁️ Cloud    │  │  Awareness   │  │    ment      │      │
│  │              │  │    🧠        │  │    🔄        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                    ┌──────────────┐                         │
│                    │   Workflow   │                         │
│                    │   Engine     │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Backblaze  │
                    │  B2 Cloud   │
                    └─────────────┘
```

---

## 🔧 Tool Registration

Add custom tools to the agent:

```javascript
// In environment-awareness.js
this.registerTool({
  id: 'my_tool',
  name: 'My Custom Tool',
  description: 'What it does',
  category: 'custom',
  confidence: 0.9,
  safety: 'low',
  inputs: ['param1', 'param2'],
  outputs: ['result'],
  examples: ['example usage'],
  enabled: true
});
```

---

## 📈 Self-Improvement Process

1. **Analyze Intent** → Understand what user wants
2. **Select Tools** → Choose best tools for the job
3. **Design Workflow** → Create optimal execution plan
4. **Execute** → Run the workflow
5. **Record Outcome** → Learn from success/failure
6. **Auto-Improve** → Adjust based on metrics

---

## 🪣 B2 Cloud Operations

### Upload File
```javascript
await agent.uploadToCloud(
  '/local/path/file.zip',
  'backups/file.zip',
  { contentType: 'application/zip' }
);
// ☁️ ⬆️ ✅ Upload file.zip (2.5 MB)
```

### Download File
```javascript
await agent.downloadFromCloud(
  'backups/file.zip',
  '/local/path/file.zip'
);
// ☁️ ⬇️ ✅ Download file.zip (2.5 MB)
```

### List Files
```javascript
const files = await agent.listCloudFiles('backups/');
// 📁 backups/:
// 1. 📄 file1.zip (1.2 MB)
// 2. 📄 file2.zip (3.4 MB)
```

---

## 📝 Memory Types

| Type | Use Case | Sync Priority |
|------|----------|---------------|
| `general` | User preferences, context | Normal |
| `critical` | Important data, credentials | Immediate |
| `directive` | System instructions | Immediate |
| `meta` | Agent self-knowledge | Normal |
| `learning` | Interaction history | Normal |
| `history` | Past conversations | Low |

---

## 🎯 Intent Categories

The agent recognizes these intent categories:
- `execution` - Run code/commands
- `storage` - File/cloud operations
- `version_control` - Git/GitHub operations
- `communication` - Telegram/messaging
- `cognition` - Memory/knowledge
- `filesystem` - File operations
- `meta` - Self-modification

---

## 📊 Monitoring

Get comprehensive status:

```javascript
const status = await agent.getStatus();

// Returns:
{
  sessionId: 'lxxxxxx',
  initialized: true,
  awareness: {
    tools: { total: 9, available: 9 }
  },
  improvement: {
    metrics: {
      helpfulnessScore: 0.85,
      efficiencyScore: 0.90,
      reliabilityScore: 0.95
    }
  },
  memory: {
    totalMemories: 42,
    totalSizeFormatted: '156.7 KB'
  }
}
```

---

## 🔒 Security

- Tool execution requires explicit enabling
- High-risk tools require confirmation
- B2 credentials never logged
- Command whitelist for safety

---

## 🚦 Next Steps

1. **Deploy to Render** - Update your Render service
2. **Configure B2** - Set environment variables
3. **Test Cloud Memory** - Store and recall memories
4. **Try Self-Improvement** - Let it learn from interactions
5. **Upload Files** - Use B2 cloud storage

---

**The agent is now self-aware, cloud-backed, and continuously improving!** 🚀✨
