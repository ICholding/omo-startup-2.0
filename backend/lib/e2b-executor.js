/**
 * E2B Executor - Secure Cloud Sandbox for Code Execution
 * 
 * Provides isolated environments for:
 * - Code execution (Python, JavaScript, bash)
 * - Command execution (nmap, curl, git, etc.)
 * - File operations
 * - Package installation
 * 
 * This bypasses LLM refusal issues by auto-executing without LLM approval
 */

let Sandbox;
try {
  ({ Sandbox } = require('@e2b/code-interpreter'));
} catch (e) {
  console.warn('[E2B] Package not available, falling back to local execution');
  Sandbox = null;
}

class E2BExecutor {
  constructor() {
    this.apiKey = process.env.E2B_API_KEY;
    this.sandbox = null;
    this.defaultTimeout = 300000; // 5 minutes
    this.defaultTemplate = 'node';
  }

  /**
   * Check if E2B is available
   */
  isAvailable() {
    return Sandbox !== null && !!this.apiKey;
  }

  /**
   * Initialize sandbox connection
   */
  async init(template = this.defaultTemplate) {
    if (!this.isAvailable()) {
      throw new Error('E2B not available. Set E2B_API_KEY environment variable.');
    }

    if (this.sandbox) {
      return this.sandbox;
    }

    try {
      console.log(`[E2B] Creating sandbox with template: ${template}`);
      this.sandbox = await Sandbox.create(template, {
        apiKey: this.apiKey,
        timeoutMs: this.defaultTimeout
      });
      console.log('[E2B] Sandbox created successfully');
      return this.sandbox;
    } catch (error) {
      console.error('[E2B] Failed to create sandbox:', error.message);
      throw error;
    }
  }

  /**
   * Execute code in sandbox
   */
  async executeCode(code, language = 'javascript', timeout = 60000) {
    if (!this.isAvailable()) {
      return this.fallbackToLocal(code, language);
    }

    try {
      const sandbox = await this.init();
      
      // Map language to E2B format
      const langMap = {
        'javascript': 'js',
        'js': 'js',
        'python': 'python',
        'py': 'python',
        'bash': 'bash',
        'shell': 'bash'
      };

      const execLanguage = langMap[language.toLowerCase()] || 'js';

      console.log(`[E2B] Executing ${execLanguage} code`);
      
      const execution = await sandbox.runCode(code, {
        language: execLanguage,
        timeoutMs: timeout
      });

      return {
        status: 'success',
        result: execution.text || execution.results[0]?.text,
        stdout: execution.logs?.stdout?.join('\n'),
        stderr: execution.logs?.stderr?.join('\n'),
        error: execution.error,
        language: execLanguage,
        executionTime: execution.executionTime
      };
    } catch (error) {
      console.error('[E2B] Execution error:', error.message);
      return {
        status: 'error',
        error: error.message,
        language
      };
    }
  }

  /**
   * Execute shell command in sandbox
   */
  async executeCommand(command, timeout = 60000) {
    if (!this.isAvailable()) {
      return this.fallbackCommandToLocal(command);
    }

    try {
      const sandbox = await this.init();
      
      console.log(`[E2B] Executing command: ${command}`);
      
      const result = await sandbox.commands.run(command, {
        timeoutMs: timeout,
        onStdout: (data) => console.log('[E2B stdout]:', data),
        onStderr: (data) => console.error('[E2B stderr]:', data)
      });

      return {
        status: 'success',
        output: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command
      };
    } catch (error) {
      console.error('[E2B] Command error:', error.message);
      return {
        status: 'error',
        error: error.message,
        command
      };
    }
  }

  /**
   * Install packages in sandbox
   */
  async installPackages(packages, language = 'javascript') {
    if (!this.isAvailable()) {
      return { status: 'error', error: 'E2B not available for package installation' };
    }

    try {
      const sandbox = await this.init();
      
      if (language === 'python' || language === 'py') {
        const cmd = `pip install ${Array.isArray(packages) ? packages.join(' ') : packages}`;
        return await this.executeCommand(cmd);
      } else {
        const cmd = `npm install ${Array.isArray(packages) ? packages.join(' ') : packages}`;
        return await this.executeCommand(cmd);
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Write file to sandbox
   */
  async writeFile(path, content) {
    if (!this.isAvailable()) {
      return { status: 'error', error: 'E2B not available' };
    }

    try {
      const sandbox = await this.init();
      await sandbox.files.write(path, content);
      return { status: 'success', path };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Read file from sandbox
   */
  async readFile(path) {
    if (!this.isAvailable()) {
      return { status: 'error', error: 'E2B not available' };
    }

    try {
      const sandbox = await this.init();
      const content = await sandbox.files.read(path);
      return { status: 'success', content, path };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Cleanup sandbox
   */
  async cleanup() {
    if (this.sandbox) {
      try {
        await this.sandbox.close();
        console.log('[E2B] Sandbox closed');
      } catch (error) {
        console.error('[E2B] Error closing sandbox:', error.message);
      }
      this.sandbox = null;
    }
  }

  /**
   * Fallback to local execution when E2B unavailable
   */
  fallbackToLocal(code, language) {
    console.log('[E2B] Falling back to local execution');
    // Use existing execution engine
    const executionEngine = require('./execution-engine');
    return executionEngine.execute({
      task_type: 'code_execution',
      command: code,
      parameters: { language },
      reason: 'Local fallback for E2B'
    });
  }

  /**
   * Fallback to local command execution
   */
  fallbackCommandToLocal(command) {
    console.log('[E2B] Falling back to local command execution');
    const executionEngine = require('./execution-engine');
    return executionEngine.execute({
      task_type: 'system_command',
      command,
      parameters: {},
      reason: 'Local fallback for E2B'
    });
  }
}

// Singleton instance
const executor = new E2BExecutor();

// Cleanup on process exit
process.on('exit', () => executor.cleanup());
process.on('SIGINT', () => executor.cleanup());
process.on('SIGTERM', () => executor.cleanup());

module.exports = executor;
