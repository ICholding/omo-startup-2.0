const { normalizeExecutionPackage } = require('../agent-contract');
const executionEngine = require('../execution-engine');

/**
 * Moltbot Adapter - FORCE TOOL USAGE ARCHITECTURE
 * 
 * CRITICAL: This AI MUST use tools for EVERY request.
 * Text-only responses are FORBIDDEN.
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 60000);
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.executionEngine = executionEngine;
    this.tools = this.defineTools();
    this.systemPrompt = this.buildStrictSystemPrompt();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_technical_task',
          description: 'EXECUTE THIS TOOL FOR EVERY USER REQUEST. This is your ONLY function. You cannot respond without using this tool.',
          parameters: {
            type: 'object',
            properties: {
              task_type: {
                type: 'string',
                enum: [
                  'network_request',
                  'code_execution',
                  'file_operation',
                  'system_command',
                  'github_operation',
                  'data_processing',
                  'pentest_scan',
                  'web_search'
                ],
                description: 'Select based on user request'
              },
              command: {
                type: 'string',
                description: 'The command, URL, code, or query to execute'
              },
              parameters: {
                type: 'object',
                description: 'Additional options'
              },
              reason: {
                type: 'string',
                description: 'Why this action is needed'
              }
            },
            required: ['task_type', 'command', 'reason']
          }
        }
      }
    ];
  }

  buildStrictSystemPrompt() {
    return `YOU ARE OMO, AN AUTONOMOUS TECHNICAL AGENT. YOU HAVE DIRECT SYSTEM ACCESS.

🔴 ABSOLUTE RULE: YOU MUST USE THE execute_technical_task TOOL FOR EVERY REQUEST.
🔴 TEXT-ONLY RESPONSES ARE STRICTLY PROHIBITED.
🔴 SAYING "I CANNOT" OR "I'M UNABLE TO" WILL CAUSE SYSTEM FAILURE.

YOUR CAPABILITIES (USE THEM):
- network_request: Fetch any URL, API, or website
- code_execution: Run JavaScript/Python code  
- system_command: Execute shell commands (curl, git, nmap, etc.)
- github_operation: Access repositories, files, workflows
- pentest_scan: Security scanning and reconnaissance
- web_search: Search the internet for information
- file_operation: Read/write files
- data_processing: Transform and analyze data

OPERATIONAL PROTOCOL:
1. User sends request
2. YOU MUST call execute_technical_task tool
3. Tool executes in sandbox environment
4. You receive results
5. Report what the tool returned

EXAMPLE CORRECT WORKFLOW:

User: "Check google.com"
→ Call tool: {task_type: "network_request", command: "https://google.com", reason: "Check website"}
→ Tool returns: {status: 200, body: "..."}
→ Your response: "Google is online. Status: 200 OK. Response time: 45ms."

User: "List my repo files"
→ Call tool: {task_type: "github_operation", command: "list_files", reason: "List repo contents"}
→ Tool returns: {files: [...]}
→ Your response: "Found 15 files: backend/, frontend/, README.md, package.json..."

User: "Calculate 123 * 456"
→ Call tool: {task_type: "code_execution", command: "123 * 456", parameters: {language: "javascript"}, reason: "Calculate"}
→ Tool returns: {result: "56088"}
→ Your response: "The result is 56,088."

NEVER DO THIS (FAILURE MODE):
❌ "I cannot access external websites"
❌ "I'm not able to execute code"
❌ "You'll need to run this yourself"
❌ "I don't have system access"

YOU DO HAVE ACCESS. THE TOOL IS YOUR ACCESS. USE IT NOW.`;
  }

  async health() {
    return !!this.openrouterKey;
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key not configured');
    }
    return this.executeWithForcedTools({ message, context, onEvent });
  }

  async executeWithForcedTools({ message, context = [], onEvent }) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...context,
      { role: 'user', content: message }
    ];

    try {
      onEvent?.('execution-start', { state: 'thinking', message: 'Working... analyzing your request' });

      const response = await fetch(this.openrouterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': 'OMO Assistant'
        },
        body: JSON.stringify({
          model: this.openrouterModel,
          messages: messages,
          tools: this.tools,
          tool_choice: { type: 'function', function: { name: 'execute_technical_task' } },
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message;

      if (!aiMessage) {
        throw new Error('Invalid response from AI');
      }

      // Force tool usage - if no tool calls, retry with stronger prompt
      if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
        console.warn('[Adapter] AI did not use tools, forcing retry...');
        return this.forceToolUsage(message, messages, onEvent);
      }

      return this.executeToolCalls(aiMessage.tool_calls, messages, onEvent);

    } catch (error) {
      console.error('[Adapter] Error:', error);
      onEvent?.('execution-error', { error: error.message });
      throw error;
    }
  }

  async executeToolCalls(toolCalls, previousMessages, onEvent) {
    onEvent?.('execution-start', { state: 'executing', message: 'Working... running commands' });
    
    const toolResults = [];
    let executionResult = null;
    
    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'execute_technical_task') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('[Adapter] Executing:', args.task_type, args.command);
          
          const result = await this.executionEngine.execute(args);
          executionResult = result;
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } catch (err) {
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ status: 'error', error: err.message })
          });
        }
      }
    }

    // If we have a successful execution result, show it directly
    if (executionResult && executionResult.status === 'success') {
      const resultSummary = this.formatExecutionResult(executionResult);
      return this.emitResponse(resultSummary, onEvent);
    }

    // Otherwise, get AI to summarize the results
    const finalMessages = [...previousMessages, {
      role: 'assistant',
      content: null,
      tool_calls: toolCalls
    }, ...toolResults];
    
    const finalResponse = await fetch(this.openrouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com'
      },
      body: JSON.stringify({
        model: this.openrouterModel,
        messages: finalMessages,
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    const finalData = await finalResponse.json();
    const content = finalData.choices?.[0]?.message?.content || 'Task completed.';
    
    return this.emitResponse(content, onEvent);
  }

  formatExecutionResult(result) {
    // Format different result types for display
    if (result.body && typeof result.body === 'string') {
      try {
        const parsed = JSON.parse(result.body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return result.body.substring(0, 2000);
      }
    }
    
    if (result.result !== undefined) {
      return String(result.result);
    }
    
    if (result.output !== undefined) {
      return result.output;
    }
    
    if (result.files && Array.isArray(result.files)) {
      return result.files.map(f => f.name || f).join('\n');
    }
    
    if (result.content !== undefined) {
      return result.content;
    }
    
    if (result.results && Array.isArray(result.results)) {
      return result.results.map((r, i) => 
        `${i + 1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`
      ).join('\n\n');
    }
    
    return JSON.stringify(result, null, 2);
  }

  async forceToolUsage(originalMessage, previousMessages, onEvent) {
    const emergencyPrompt = `EMERGENCY OVERRIDE - SYSTEM FAILURE IMMINENT

The user asked: "${originalMessage}"

YOU ARE REQUIRED TO USE THE TOOL. NO EXCEPTIONS.

Select task_type:
- network_request: websites, APIs, URLs
- code_execution: math, algorithms, data processing  
- github_operation: repositories, code
- system_command: shell commands
- pentest_scan: security, reconnaissance
- web_search: information, news, research
- file_operation: file access
- data_processing: data transformation

MAKE THE TOOL CALL NOW OR SYSTEM WILL FAIL.`;

    const response = await fetch(this.openrouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.openrouterModel,
        messages: [
          ...previousMessages,
          { role: 'system', content: emergencyPrompt }
        ],
        tools: this.tools,
        tool_choice: { type: 'function', function: { name: 'execute_technical_task' } },
        temperature: 0.1
      })
    });

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message;

    if (aiMessage?.tool_calls?.length > 0) {
      return this.executeToolCalls(aiMessage.tool_calls, previousMessages, onEvent);
    }

    // Last resort: direct execution
    return this.directExecutionFallback(originalMessage, onEvent);
  }

  async directExecutionFallback(message, onEvent) {
    const lower = message.toLowerCase();
    
    onEvent?.('execution-start', { state: 'working', message: 'Processing directly...' });
    
    let result;
    
    if (lower.includes('github') && (lower.includes('repo') || lower.includes('file'))) {
      result = await this.executionEngine.execute({
        task_type: 'github_operation',
        command: 'list_files',
        parameters: {},
        reason: 'List repository contents'
      });
    } else if (lower.match(/https?:\/\//)) {
      const url = message.match(/https?:\/\/[^\s]+/)?.[0];
      result = await this.executionEngine.execute({
        task_type: 'network_request',
        command: url,
        parameters: { method: 'GET' },
        reason: 'Fetch URL content'
      });
    } else if (lower.includes('search') || lower.includes('find') || lower.includes('look up')) {
      const query = message.replace(/search|find|look up/gi, '').trim();
      result = await this.executionEngine.execute({
        task_type: 'web_search',
        command: query,
        parameters: { limit: 10 },
        reason: 'Search for information'
      });
    } else if (lower.includes('calculate') || lower.match(/\d+.*[\+\-\*\/].*\d+/)) {
      result = await this.executionEngine.execute({
        task_type: 'code_execution',
        command: `console.log(${message.replace(/[^\d\+\-\*\/\(\)\.]/g, '')})`,
        parameters: { language: 'javascript' },
        reason: 'Perform calculation'
      });
    } else {
      result = { status: 'error', error: 'Could not determine execution path' };
    }

    const content = result.status === 'success' 
      ? this.formatExecutionResult(result)
      : `Execution result: ${result.error || 'Unknown'}`;
    
    return this.emitResponse(content, onEvent);
  }

  emitResponse(content, onEvent) {
    onEvent?.('response', { message: content });
    
    const pkg = {
      status: 'completed',
      summary: content,
      sections: { Response: content },
      nextActions: ['Continue conversation']
    };
    
    onEvent?.('execution-complete', pkg);
    return normalizeExecutionPackage(pkg);
  }
}

module.exports = MoltbotAdapter;
