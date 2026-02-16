# 🤖 Agent Autonomy Guide

**Removing Limitations & Enabling Full Autonomous Capabilities**

---

## Overview

This guide explains how to transform the OMO/Clawbot agent from a limited assistant into a fully autonomous agent with:

✅ **Persistent Memory** - Remembers conversations across sessions  
✅ **Code Execution** - Can write and execute code  
✅ **System Access** - Can run commands and access APIs  
✅ **Self-Modification** - Can update its own code  
✅ **Autonomous Decision Making** - Can plan and execute tasks independently  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM USER                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TELEGRAM AUTONOMOUS BRIDGE                     │
│         (telegram-autonomous-bridge.js)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌────────────┐ ┌──────────┐ ┌────────────┐
│  Enhanced  │ │  Goal    │ │  Command   │
│  Memory    │ │  Manager │ │  Executor  │
└────────────┘ └──────────┘ └────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           ENHANCED AUTONOMOUS AGENT (EAA)                   │
│              (enhanced-autonomous.js)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd /home/user/omo-startup-2.0/agent
npm install sqlite3 axios
```

### 2. Configure Environment

```bash
cp .env.autonomous.example .env.autonomous
# Edit .env.autonomous with your values
```

Key settings:
```env
AGENT_AUTO_EXECUTE=true      # Allow automatic execution
AGENT_SELF_MODIFY=true       # Allow self-modification
AGENT_MAX_EXEC_TIME=60000    # Max execution time (ms)
```

### 3. Test the Agent

```bash
node enhanced-autonomous.js
```

You should see:
```
=== Enhanced Autonomous Agent Demo ===
1. Testing Persistent Memory...
   Recalled user: Data_eli
2. Testing Goal Management...
   Created goal: Deploy OpenClaw to production
3. Testing Code Execution...
   Execution success: true
4. Agent Status:
   Memories: 2
   Goals: 1
```

---

## Capabilities

### 1. Persistent Memory 🧠

**Before:** "I cannot maintain persistent memory between conversations"

**After:**
```javascript
// Agent remembers across sessions
await agent.remember('user_preference', { theme: 'dark' });
const pref = await agent.recall('user_preference');
// Returns: { theme: 'dark' }
```

**Telegram Usage:**
```
User: remember my name as Data_eli
Bot: 🧠 Remembered: Key: `my name` Value: `Data_eli`

User: recall my name
Bot: 🧠 Recalled: Key: `my name` Value: `Data_eli`
```

### 2. Code Execution ⚡

**Before:** "I cannot execute code"

**After:**
```javascript
const result = await agent.executeCode(`
  console.log('Hello from autonomous agent!');
  const data = { status: 'active', timestamp: Date.now() };
  console.log(JSON.stringify(data));
`, 'javascript');
```

**Telegram Usage:**
```
User: ```javascript
console.log('Hello!');
```

Bot: ✅ Code executed successfully!
📤 Output:
Hello!
```

### 3. System Commands 🔧

**Before:** "I cannot access servers or systems"

**After:**
```javascript
const result = await agent.executeCommand('git', ['status']);
```

**Telegram Usage:**
```
User: command: git status
Bot: ✅ Command executed!
```bash
$ git status
On branch main
Your branch is up to date with 'origin/main'.
```

### 4. Self-Modification 🔄

**Before:** "I cannot modify myself"

**After:**
```javascript
await agent.selfModify('config.js', [
  { type: 'replace', find: 'oldValue', replace: 'newValue' }
]);
```

### 5. Autonomous Tasks 🤖

**Before:** "I need explicit instructions for every action"

**After:**
```
User: autonomous: deploy the latest changes to production

Bot: 🤖 Autonomous Mode Activated
Goal ID: abc123
Task: deploy the latest changes to production

📋 Planned Actions:
1. Run deployment checks
2. Build project
3. Deploy

⚡ Executing...
✅ Task completed!
Results: 3/3 successful
```

---

## Integration with Backend

### Update Server.js

Add to `/home/user/omo-startup-2.0/backend/server.js`:

```javascript
// Add after other route imports
const telegramAutonomousRouter = require('./src/routes/telegram-autonomous');

// Add before other routes
app.use('/api/telegram', telegramAutonomousRouter);
```

### Environment Variables

Add to your `.env`:
```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_secret

# Agent
AGENT_AUTO_EXECUTE=true
AGENT_SELF_MODIFY=true
AGENT_MEMORY_PATH=./data/agent-memory.db
```

---

## Security Considerations

### Whitelisted Commands

By default, only these commands are allowed:
- `git`, `npm`, `node`, `curl`, `wget`
- `cat`, `ls`, `pwd`, `mkdir`, `rm`, `cp`, `mv`
- `echo`, `grep`, `find`, `ps`

### To Add More Commands

Edit `enhanced-autonomous.js`:
```javascript
const CONFIG = {
  allowedCommands: [
    ...existing commands...,
    'docker', 'kubectl', 'terraform'  // Add yours
  ]
};
```

### Self-Modification Safety

Self-modification is disabled by default. Enable with:
```env
AGENT_SELF_MODIFY=true
```

When enabled:
- Backups are created automatically (`file.js.backup`)
- Changes are logged to memory
- Can be reverted if needed

---

## Advanced Usage

### Custom Actions

Add custom actions to the bridge:

```javascript
// In telegram-autonomous-bridge.js
async handleCustomAction(userId, params) {
  // Your custom logic here
  const result = await someExternalAPI(params);
  return { text: `Result: ${result}` };
}
```

### Learning System

The agent can learn from successful actions:

```javascript
await agent.learnPattern('deployment_workflow', true);
// Agent will remember this pattern for future use
```

### Goal Management

Set long-term goals:

```javascript
const goal = await agent.setGoal(
  'Migrate to Kubernetes',
  9,  // Priority (1-10)
  '2026-03-01'  // Deadline
);
```

---

## API Endpoints

### Telegram Webhook
```
POST /webhook/telegram/:secret
```

### Agent Status
```
GET /api/telegram/status
```

### Send Message
```
POST /api/telegram/send
{
  "chat_id": "123456",
  "text": "Hello!",
  "parse_mode": "Markdown"
}
```

### Set Webhook
```
POST /api/telegram/webhook
{
  "url": "https://your-app.com"
}
```

---

## Troubleshooting

### "Cannot execute code"
Check that `AGENT_AUTO_EXECUTE=true` in environment.

### "Command not allowed"
Add command to `allowedCommands` in `enhanced-autonomous.js`.

### "Memory not persistent"
Check that `AGENT_MEMORY_PATH` is writable:
```bash
touch ./data/agent-memory.db
chmod 666 ./data/agent-memory.db
```

### "Self-modification failed"
Ensure backups can be created in workspace directory.

---

## Migration from Old Bot

If you're using the old Telegram bot:

1. Backup your current setup
2. Install new dependencies: `npm install sqlite3`
3. Copy `.env.autonomous.example` to `.env.autonomous`
4. Update your `server.js` to use `telegram-autonomous.js`
5. Test with `/status` command

---

## Next Steps

1. **Test all capabilities** using the demo
2. **Configure security** for your environment
3. **Add custom integrations** (SSH, Gmail, etc.)
4. **Deploy** to production
5. **Monitor** via status endpoint

---

## Support

For issues or questions:
- Check logs: `tail -f agent.log`
- Review memory: `sqlite3 agent-memory.db "SELECT * FROM memories;"`
- Test directly: `node enhanced-autonomous.js`

---

**The agent is now fully autonomous!** 🚀
