/**
 * Enhanced Autonomous Agent (EAA)
 * Removes limitations and provides full autonomous capabilities
 * 
 * Capabilities:
 * - Self-modification and code evolution
 * - Persistent memory across sessions
 * - Direct system access (SSH, email, APIs)
 * - Autonomous decision making
 * - Goal-oriented task execution
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// Configuration
const CONFIG = {
  memoryPath: process.env.AGENT_MEMORY_PATH || './agent-memory.db',
  workspacePath: process.env.AGENT_WORKSPACE || './agent-workspace',
  allowedCommands: [
    'git', 'npm', 'node', 'curl', 'wget', 'cat', 'ls', 'pwd',
    'mkdir', 'rm', 'cp', 'mv', 'echo', 'grep', 'find', 'ps'
  ],
  autoExecute: process.env.AGENT_AUTO_EXECUTE === 'true',
  maxExecutionTime: parseInt(process.env.AGENT_MAX_EXEC_TIME) || 30000,
  selfModification: process.env.AGENT_SELF_MODIFY !== 'false'
};

class EnhancedAutonomousAgent {
  constructor() {
    this.db = null;
    this.sessionId = Date.now().toString(36);
    this.goals = [];
    this.context = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize persistent memory
    await this.initMemory();

    // Create workspace
    if (!fs.existsSync(CONFIG.workspacePath)) {
      fs.mkdirSync(CONFIG.workspacePath, { recursive: true });
    }

    // Load previous context
    await this.loadContext();

    this.initialized = true;
    console.log(`[EAA] Agent ${this.sessionId} initialized with autonomous capabilities`);
  }

  async initMemory() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(CONFIG.memoryPath, (err) => {
        if (err) {
          console.error('[EAA] Memory initialization failed:', err);
          reject(err);
          return;
        }

        // Create memory tables
        this.db.run(`
          CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE,
            value TEXT,
            type TEXT DEFAULT 'general',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            access_count INTEGER DEFAULT 0
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            context TEXT,
            goals TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            action TEXT,
            result TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS learned_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT UNIQUE,
            success_rate REAL,
            use_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // PERSISTENT MEMORY - Removes "cannot maintain persistent memory" limitation
  async remember(key, value, type = 'general') {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO memories (key, value, type, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [key, JSON.stringify(value), type],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`[EAA] Remembered: ${key}`);
            resolve(true);
          }
        }
      );
    });
  }

  async recall(key, defaultValue = null) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT value FROM memories WHERE key = ?`,
        [key],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            // Update access count
            this.db.run(`UPDATE memories SET access_count = access_count + 1 WHERE key = ?`, [key]);
            try {
              resolve(JSON.parse(row.value));
            } catch {
              resolve(row.value);
            }
          } else {
            resolve(defaultValue);
          }
        }
      );
    });
  }

  async recallByType(type, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT key, value, timestamp FROM memories WHERE type = ? ORDER BY timestamp DESC LIMIT ?`,
        [type, limit],
        (err, rows) => {
          if (err) reject(err);
          else {
            const results = rows.map(row => ({
              key: row.key,
              value: JSON.parse(row.value),
              timestamp: row.timestamp
            }));
            resolve(results);
          }
        }
      );
    });
  }

  // SELF-MODIFICATION - Removes "cannot modify itself" limitation
  async selfModify(filePath, modifications) {
    if (!CONFIG.selfModification) {
      return { success: false, error: 'Self-modification disabled' };
    }

    try {
      const fullPath = path.resolve(CONFIG.workspacePath, filePath);
      let content = fs.readFileSync(fullPath, 'utf8');

      for (const mod of modifications) {
        if (mod.type === 'replace') {
          content = content.replace(mod.find, mod.replace);
        } else if (mod.type === 'append') {
          content += '\n' + mod.content;
        } else if (mod.type === 'prepend') {
          content = mod.content + '\n' + content;
        }
      }

      // Backup original
      fs.writeFileSync(fullPath + '.backup', fs.readFileSync(fullPath));

      // Apply modifications
      fs.writeFileSync(fullPath, content);

      await this.remember(`self_mod_${Date.now()}`, {
        file: filePath,
        modifications,
        timestamp: new Date().toISOString()
      }, 'self_modification');

      return { success: true, file: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // CODE EXECUTION - Removes "cannot execute code" limitation
  async executeCode(code, language = 'javascript', timeout = CONFIG.maxExecutionTime) {
    const executionId = Date.now().toString(36);
    const fileName = `exec_${executionId}.${language === 'javascript' ? 'js' : language}`;
    const filePath = path.join(CONFIG.workspacePath, fileName);

    try {
      fs.writeFileSync(filePath, code);

      let command;
      switch (language) {
        case 'javascript':
        case 'js':
          command = `node ${filePath}`;
          break;
        case 'python':
        case 'py':
          command = `python3 ${filePath}`;
          break;
        case 'bash':
        case 'sh':
          command = `bash ${filePath}`;
          break;
        default:
          return { success: false, error: `Unsupported language: ${language}` };
      }

      const { stdout, stderr } = await execAsync(command, { timeout });

      await this.remember(`execution_${executionId}`, {
        code: code.substring(0, 500),
        language,
        stdout,
        stderr,
        timestamp: new Date().toISOString()
      }, 'execution');

      return {
        success: true,
        executionId,
        stdout,
        stderr,
        output: stdout || stderr
      };
    } catch (error) {
      return {
        success: false,
        executionId,
        error: error.message,
        stderr: error.stderr
      };
    }
  }

  // SYSTEM COMMAND EXECUTION
  async executeCommand(command, args = [], timeout = CONFIG.maxExecutionTime) {
    const cmdBase = command.split(' ')[0];
    
    if (!CONFIG.allowedCommands.includes(cmdBase)) {
      return {
        success: false,
        error: `Command '${cmdBase}' not in allowed list. Allowed: ${CONFIG.allowedCommands.join(', ')}`
      };
    }

    const fullCommand = `${command} ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
        cwd: CONFIG.workspacePath
      });

      await this.remember(`command_${Date.now()}`, {
        command: fullCommand,
        stdout: stdout.substring(0, 1000),
        stderr: stderr.substring(0, 1000),
        timestamp: new Date().toISOString()
      }, 'command');

      return {
        success: true,
        stdout,
        stderr,
        output: stdout || stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.stderr
      };
    }
  }

  // AUTONOMOUS GOAL MANAGEMENT
  async setGoal(goal, priority = 5, deadline = null) {
    const goalObj = {
      id: Date.now().toString(36),
      description: goal,
      priority,
      deadline,
      status: 'pending',
      created: new Date().toISOString()
    };

    this.goals.push(goalObj);
    await this.remember(`goal_${goalObj.id}`, goalObj, 'goal');
    await this.saveContext();

    return goalObj;
  }

  async getGoals(status = null) {
    if (status) {
      return this.goals.filter(g => g.status === status);
    }
    return this.goals;
  }

  async completeGoal(goalId, result = null) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
      goal.result = result;
      await this.remember(`goal_${goalId}`, goal, 'goal');
      await this.saveContext();
    }
    return goal;
  }

  // EXTERNAL API ACCESS - Removes "cannot access external systems" limitation
  async makeRequest(url, options = {}) {
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body || null,
        timeout: options.timeout || 10000
      });

      await this.remember(`request_${Date.now()}`, {
        url,
        method: options.method || 'GET',
        status: response.status,
        timestamp: new Date().toISOString()
      }, 'request');

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  // LEARNING SYSTEM
  async learnPattern(pattern, success = true) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM learned_patterns WHERE pattern = ?`,
        [pattern],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            const newSuccessRate = ((row.success_rate * row.use_count) + (success ? 1 : 0)) / (row.use_count + 1);
            this.db.run(
              `UPDATE learned_patterns SET success_rate = ?, use_count = use_count + 1 WHERE pattern = ?`,
              [newSuccessRate, pattern],
              (err) => {
                if (err) reject(err);
                else resolve({ learned: true, updated: true });
              }
            );
          } else {
            this.db.run(
              `INSERT INTO learned_patterns (pattern, success_rate, use_count) VALUES (?, ?, 1)`,
              [pattern, success ? 1 : 0],
              (err) => {
                if (err) reject(err);
                else resolve({ learned: true, new: true });
              }
            );
          }
        }
      );
    });
  }

  // CONTEXT MANAGEMENT
  async loadContext() {
    const context = await this.recall('current_context');
    const goals = await this.recall('current_goals');
    
    if (context) this.context = context;
    if (goals) this.goals = goals;
  }

  async saveContext() {
    await this.remember('current_context', this.context);
    await this.remember('current_goals', this.goals);
    
    this.db.run(
      `INSERT OR REPLACE INTO sessions (id, context, goals, last_active) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [this.sessionId, JSON.stringify(this.context), JSON.stringify(this.goals)]
    );
  }

  // AUTONOMOUS ACTION PROCESSING
  async processAutonomousAction(intent, params = {}) {
    await this.initialize();

    const actionRecord = {
      session_id: this.sessionId,
      action: intent,
      timestamp: new Date().toISOString()
    };

    let result;

    switch (intent) {
      case 'execute_code':
        result = await this.executeCode(params.code, params.language);
        break;

      case 'execute_command':
        result = await this.executeCommand(params.command, params.args);
        break;

      case 'self_modify':
        result = await this.selfModify(params.file, params.modifications);
        break;

      case 'make_request':
        result = await this.makeRequest(params.url, params.options);
        break;

      case 'remember':
        result = await this.remember(params.key, params.value, params.type);
        break;

      case 'recall':
        result = await this.recall(params.key, params.default);
        break;

      case 'set_goal':
        result = await this.setGoal(params.goal, params.priority, params.deadline);
        break;

      case 'learn':
        result = await this.learnPattern(params.pattern, params.success);
        break;

      default:
        result = { success: false, error: `Unknown intent: ${intent}` };
    }

    // Record action result
    actionRecord.result = JSON.stringify(result);
    this.db.run(
      `INSERT INTO actions (session_id, action, result, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [actionRecord.session_id, actionRecord.action, actionRecord.result]
    );

    return result;
  }

  // GET AGENT STATUS
  async getStatus() {
    const memories = await new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as count FROM memories`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const actions = await new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as count FROM actions WHERE session_id = ?`, [this.sessionId], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const patterns = await new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as count FROM learned_patterns`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    return {
      sessionId: this.sessionId,
      initialized: this.initialized,
      memoryPath: CONFIG.memoryPath,
      workspacePath: CONFIG.workspacePath,
      selfModificationEnabled: CONFIG.selfModification,
      autoExecuteEnabled: CONFIG.autoExecute,
      stats: {
        memories,
        actions,
        patterns,
        goals: this.goals.length
      }
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export for use in other modules
module.exports = EnhancedAutonomousAgent;

// If run directly, demonstrate capabilities
if (require.main === module) {
  const agent = new EnhancedAutonomousAgent();
  
  async function demo() {
    await agent.initialize();
    
    console.log('\n=== Enhanced Autonomous Agent Demo ===\n');
    
    // Test 1: Persistent Memory
    console.log('1. Testing Persistent Memory...');
    await agent.remember('user_name', 'Data_eli');
    await agent.remember('preferences', { theme: 'dark', language: 'en' });
    const userName = await agent.recall('user_name');
    console.log(`   Recalled user: ${userName}`);
    
    // Test 2: Goal Setting
    console.log('\n2. Testing Goal Management...');
    const goal = await agent.setGoal('Deploy OpenClaw to production', 10);
    console.log(`   Created goal: ${goal.description}`);
    
    // Test 3: Code Execution
    console.log('\n3. Testing Code Execution...');
    const codeResult = await agent.executeCode(
      `console.log('Hello from autonomous agent!');
       const data = { timestamp: Date.now(), status: 'active' };
       console.log(JSON.stringify(data));`,
      'javascript'
    );
    console.log(`   Execution success: ${codeResult.success}`);
    console.log(`   Output: ${codeResult.output?.substring(0, 100)}`);
    
    // Test 4: Status
    console.log('\n4. Agent Status:');
    const status = await agent.getStatus();
    console.log(`   Memories: ${status.stats.memories}`);
    console.log(`   Goals: ${status.stats.goals}`);
    console.log(`   Session: ${status.sessionId}`);
    
    console.log('\n=== Demo Complete ===\n');
    
    agent.close();
  }
  
  demo().catch(console.error);
}
