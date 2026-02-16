/**
 * Execution Engine - Integrated Technical Task Runner
 * 
 * Previously: Separate Moltbot Docker container
 * Now: Built-in module within the backend app
 * 
 * Benefits:
 * - Zero connection issues (same process)
 * - Single environment variable configuration
 * - In-memory GitHub token (more secure)
 * - Faster execution (no HTTP hop)
 */

const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const vm = require('vm');
const fs = require('fs').promises;
const path = require('path');
const pentestTools = require('./tools/pentest-tools');

class ExecutionEngine {
  constructor() {
    this.workDir = process.env.EXECUTION_WORKDIR || '/tmp/omo-execution';
    this.allowedCommands = [
      'curl', 'wget', 'node', 'python3', 'python', 
      'cat', 'echo', 'ls', 'grep', 'awk', 'sed', 'jq', 'git'
    ];
    this.githubToken = process.env.GITHUB_TOKEN;
    this.githubRepo = process.env.GITHUB_REPO || 'ICholding/omo-startup-2.0';
  }

  /**
   * Execute any technical task
   */
  async execute(task) {
    const { task_type, command, parameters = {}, reason } = task;
    
    console.log(`[ExecutionEngine] ${task_type}: ${command?.substring(0, 100)}...`);
    
    switch (task_type) {
      case 'network_request':
        return this.networkRequest(command, parameters);
      case 'system_command':
        return this.systemCommand(command, parameters);
      case 'code_execution':
        return this.codeExecution(command, parameters);
      case 'file_operation':
        return this.fileOperation(command, parameters);
      case 'github_operation':
        return this.githubOperation(command, parameters);
      case 'data_processing':
        return this.dataProcessing(command, parameters);
      case 'pentest_scan':
      case 'security_scan':
        return this.pentestScan(command, parameters);
      default:
        return { 
          status: 'error', 
          error: `Unknown task type: ${task_type}` 
        };
    }
  }

  /**
   * Network requests (HTTP/HTTPS)
   */
  async networkRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: 'success',
            statusCode: res.statusCode,
            headers: res.headers,
            body: data.substring(0, 50000) // 50KB limit
          });
        });
      });

      req.on('error', (err) => reject({ 
        status: 'error', 
        error: err.message 
      }));
      
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      
      req.setTimeout(options.timeout || 30000, () => {
        req.destroy();
        reject({ status: 'error', error: 'Request timeout' });
      });
      
      req.end();
    });
  }

  /**
   * System commands (whitelist-based)
   */
  async systemCommand(command, options = {}) {
    return new Promise((resolve) => {
      const cmdBase = command.split(' ')[0];
      
      if (!this.allowedCommands.includes(cmdBase)) {
        resolve({ 
          status: 'restricted', 
          error: `Command '${cmdBase}' not allowed. Available: ${this.allowedCommands.join(', ')}` 
        });
        return;
      }

      // Inject GitHub token for git commands if available
      let finalCommand = command;
      if (cmdBase === 'git' && this.githubToken) {
        finalCommand = `GIT_TOKEN=${this.githubToken} ${command}`;
      }

      exec(finalCommand, { 
        timeout: options.timeout || 30000, 
        maxBuffer: 5 * 1024 * 1024 // 5MB
      }, (error, stdout, stderr) => {
        if (error) {
          resolve({ 
            status: 'error', 
            error: error.message, 
            stderr: stderr?.substring(0, 10000)
          });
        } else {
          resolve({ 
            status: 'success', 
            output: stdout?.substring(0, 50000),
            stderr: stderr?.substring(0, 5000)
          });
        }
      });
    });
  }

  /**
   * Code execution in sandbox
   */
  async codeExecution(code, options = {}) {
    const language = options.language || 'javascript';
    
    if (language === 'javascript' || language === 'node') {
      try {
        const context = { 
          console, 
          require, 
          exports, 
          module, 
          __dirname: this.workDir,
          __filename: path.join(this.workDir, 'script.js'),
          fetch: require('node-fetch'),
          setTimeout,
          clearTimeout,
          Buffer,
          JSON,
          Math,
          Date,
          Array,
          Object,
          String,
          Number
        };
        
        vm.createContext(context);
        const result = vm.runInContext(code, context, { 
          timeout: options.timeout || 10000,
          displayErrors: true
        });
        
        return { 
          status: 'success', 
          result: String(result),
          type: typeof result
        };
      } catch (err) {
        return { status: 'error', error: err.message };
      }
    }
    
    if (language === 'python' || language === 'python3') {
      // Python not available in standard Node container
      return { 
        status: 'error', 
        error: 'Python execution requires Python installation. Use JavaScript or system commands instead.'
      };
    }
    
    return { status: 'error', error: `Unsupported language: ${language}` };
  }

  /**
   * File operations
   */
  async fileOperation(target, options = {}) {
    const operation = options.operation || 'read';
    const workPath = path.join(this.workDir, target);
    
    // Security: ensure path stays within workDir
    if (!workPath.startsWith(this.workDir)) {
      return { status: 'error', error: 'Invalid path - must be within workspace' };
    }
    
    try {
      await fs.mkdir(this.workDir, { recursive: true });
      
      switch (operation) {
        case 'write':
          await fs.writeFile(workPath, options.content || target, 'utf8');
          return { status: 'success', message: `Written to ${target}` };
          
        case 'read':
          const content = await fs.readFile(workPath, 'utf8');
          return { status: 'success', content: content?.substring(0, 100000) };
          
        case 'delete':
          await fs.unlink(workPath);
          return { status: 'success', message: `Deleted ${target}` };
          
        case 'list':
          const files = await fs.readdir(this.workDir);
          return { status: 'success', files };
          
        default:
          return { status: 'error', error: `Unknown operation: ${operation}` };
      }
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  /**
   * GitHub API operations
   */
  async githubOperation(action, options = {}) {
    if (!this.githubToken) {
      return { 
        status: 'error', 
        error: 'GITHUB_TOKEN not configured. Add it to environment variables.'
      };
    }
    
    const baseUrl = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${this.githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OMO-Assistant'
    };
    
    try {
      switch (action) {
        case 'get_file':
          const fileUrl = `${baseUrl}/repos/${this.githubRepo}/contents/${options.path}`;
          const fileRes = await this.networkRequest(fileUrl, { headers });
          return fileRes;
          
        case 'list_files':
          const dirUrl = `${baseUrl}/repos/${this.githubRepo}/contents/${options.path || ''}`;
          const dirRes = await this.networkRequest(dirUrl, { headers });
          return dirRes;
          
        case 'trigger_workflow':
          const workflowUrl = `${baseUrl}/repos/${this.githubRepo}/actions/workflows/${options.workflow}/dispatches`;
          const wfRes = await this.networkRequest(workflowUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: options.ref || 'main', inputs: options.inputs || {} })
          });
          return wfRes;
          
        case 'get_commits':
          const commitsUrl = `${baseUrl}/repos/${this.githubRepo}/commits?sha=${options.branch || 'main'}&per_page=${options.limit || 10}`;
          const commitsRes = await this.networkRequest(commitsUrl, { headers });
          return commitsRes;
          
        default:
          return { status: 'error', error: `Unknown GitHub action: ${action}` };
      }
    } catch (err) {
      return { status: 'error', error: err.message || 'GitHub API error' };
    }
  }

  /**
   * Pentest/Security scanning
   */
  async pentestScan(scanType, options = {}) {
    const target = options.target || options.url || options.host;
    
    if (!target) {
      return { 
        status: 'error', 
        error: 'Missing target. Provide target, url, or host in parameters.' 
      };
    }

    try {
      const result = await pentestTools.execute(scanType, target, options);
      return result;
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Data processing utilities
   */
  async dataProcessing(data, options = {}) {
    try {
      const transform = options.transform || 'identity';
      let input = data;
      
      if (typeof data === 'string') {
        try {
          input = JSON.parse(data);
        } catch {}
      }
      
      switch (transform) {
        case 'json_to_csv':
          if (!Array.isArray(input)) {
            return { status: 'error', error: 'JSON to CSV requires an array of objects' };
          }
          const keys = Object.keys(input[0] || {});
          const csv = [
            keys.join(','),
            ...input.map(row => keys.map(k => JSON.stringify(row[k] || '')).join(','))
          ].join('\n');
          return { status: 'success', data: csv };
          
        case 'csv_to_json':
          // Simple CSV parser
          const lines = input.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',');
          const json = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, i) => {
              obj[header] = values[i];
              return obj;
            }, {});
          });
          return { status: 'success', data: json };
          
        case 'summarize':
          if (typeof input === 'string') {
            const words = input.split(/\s+/).length;
            const lines = input.split('\n').length;
            return { 
              status: 'success', 
              summary: { words, lines, preview: input.substring(0, 500) } 
            };
          }
          return { status: 'success', summary: { type: typeof input, keys: Object.keys(input) } };
          
        default:
          return { status: 'success', data: input };
      }
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}

// Singleton instance
module.exports = new ExecutionEngine();
