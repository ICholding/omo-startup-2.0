const { normalizeExecutionPackage } = require('../agent-contract');
const executionEngine = require('../execution-engine');
const modelRouter = require('../model-router');

/**
 * Moltbot Adapter - Multi-Model Architecture
 * 
 * Uses OpenRouter to route to different models based on task:
 * - Chat Mode: Claude (conversational)
 * - Agent Mode: XAI Grok (fewer restrictions)
 * - Code Mode: GPT-4o (code generation)
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 60000);
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.executionEngine = executionEngine;
    this.modelRouter = modelRouter;
    this.tools = this.defineTools();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_technical_task',
          description: 'Execute technical operations including: network requests, shell commands, code execution, GitHub operations, security scanning, web search, and file operations.',
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
                description: 'The type of task to execute'
              },
              command: {
                type: 'string',
                description: 'The command, URL, code, or query to execute'
              },
              parameters: {
                type: 'object',
                description: 'Additional parameters for the task'
              },
              reason: {
                type: 'string',
                description: 'Reason for executing this task'
              }
            },
            required: ['task_type', 'command', 'reason']
          }
        }
      }
    ];
  }

  async health() {
    return !!this.openrouterKey;
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Route to appropriate model based on task
    const route = await this.modelRouter.route(message, context, onEvent);
    console.log(`[Adapter] Routed to ${route.mode} mode using ${route.model}`);

    return this.executeWithModel({ 
      message, 
      context: route.context, 
      model: route.model,
      mode: route.mode,
      onEvent 
    });
  }

  async executeWithModel({ message, context, model, mode, onEvent }) {
    const messages = [
      { role: 'system', content: context.find(m => m.mode)?.content || this.modelRouter.getSystemPrompt(mode) },
      ...context.filter(m => !m.mode),  // Filter out router system messages
      { role: 'user', content: message }
    ];

    try {
      onEvent?.('execution-start', { 
        state: 'thinking', 
        message: `Working... (${mode} mode)`,
        mode 
      });

      onEvent?.('execution-start', {
        state: 'planning',
        message: 'Working... planning tool strategy',
        mode
      });

      const toolConfig = this.modelRouter.getToolConfig(mode);

      const response = await fetch(this.openrouterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': 'OMO Assistant'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          tools: this.tools,
          tool_choice: toolConfig.tool_choice,
          temperature: toolConfig.temperature,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter error: ${response.status} - ${error.error?.message || 'Unknown'}`);
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message;

      if (!aiMessage) {
        throw new Error('Invalid response from AI');
      }

      // Handle tool calls
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        return this.executeToolCalls(aiMessage.tool_calls, messages, model, mode, onEvent);
      }

      // For agent mode, force tool usage if no tool calls
      if (mode === 'agent' && (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0)) {
        console.warn('[Adapter] Agent mode did not use tools, forcing...');
        return this.forceToolUsage(message, messages, model, onEvent);
      }

      // For chat/code mode, return direct response
      const content = aiMessage.content || 'Task completed.';
      return this.emitResponse(content, onEvent);

    } catch (error) {
      console.error('[Adapter] Error:', error);
      onEvent?.('execution-error', { error: error.message });
      throw error;
    }
  }

  async executeToolCalls(toolCalls, previousMessages, model, mode, onEvent) {
    onEvent?.('execution-start', { 
      state: 'executing', 
      message: 'Working... running commands',
      mode 
    });
    
    const toolResults = [];
    let executionResult = null;
    
    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'execute_technical_task') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[Adapter] Executing: ${args.task_type} - ${args.command}`);

          onEvent?.('execution-start', {
            state: 'executing',
            message: `Working... ${args.task_type.replace(/_/g, ' ')}`,
            mode
          });
          
          const result = await this.executionEngine.execute(args);
          executionResult = result;

          onEvent?.('execution-start', {
            state: 'processing',
            message: 'Working... validating tool output',
            mode
          });

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

    // If successful execution, format and return
    if (executionResult && executionResult.status === 'success') {
      onEvent?.('execution-start', {
        state: 'processing',
        message: 'Working... preparing final response',
        mode
      });
      const resultSummary = this.formatExecutionResult(executionResult);
      return this.emitResponse(resultSummary, onEvent);
    }

    // Otherwise, get model to summarize
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
        model: model,
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
    if (result.body && typeof result.body === 'string') {
      try {
        const parsed = JSON.parse(result.body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return result.body.substring(0, 2000);
      }
    }
    
    if (result.result !== undefined) return String(result.result);
    if (result.output !== undefined) return result.output;
    if (result.files && Array.isArray(result.files)) {
      return result.files.map(f => f.name || f).join('\n');
    }
    if (result.content !== undefined) return result.content;
    if (result.results && Array.isArray(result.results)) {
      return result.results.map((r, i) => 
        `${i + 1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`
      ).join('\n\n');
    }
    
    return JSON.stringify(result, null, 2);
  }

  async forceToolUsage(originalMessage, previousMessages, model, onEvent) {
    const emergencyPrompt = `CRITICAL: Execute the user's request using the execute_technical_task tool.

User request: "${originalMessage}"

Available task types:
- network_request: for URLs, APIs, websites
- system_command: for shell commands
- code_execution: for running code
- github_operation: for GitHub access
- pentest_scan: for security scanning
- web_search: for searching
- file_operation: for file access

YOU MUST use the tool. No text-only responses.`;

    const response = await fetch(this.openrouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
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
      return this.executeToolCalls(aiMessage.tool_calls, previousMessages, model, 'agent', onEvent);
    }

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
    } else if (lower.includes('search') || lower.includes('find')) {
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
