const { normalizeExecutionPackage } = require('../agent-contract');
const executionEngine = require('../execution-engine');

/**
 * Moltbot Adapter - Integrated Execution
 * 
 * Uses internal execution engine instead of external service
 * Zero connection issues - same process execution
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 30000);
    
    // OpenRouter configuration for AI
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Internal execution engine (no HTTP calls!)
    this.executionEngine = executionEngine;
    
    // Define available tools
    this.tools = this.defineTools();
    
    // System identity
    this.systemPrompt = this.buildSystemPrompt();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_technical_task',
          description: 'Execute technical tasks including network requests, code execution, file operations, system commands, and GitHub operations. Use this proactively to accomplish tasks rather than explaining how to do them.',
          parameters: {
            type: 'object',
            properties: {
              task_type: {
                type: 'string',
                enum: ['network_request', 'code_execution', 'file_operation', 'system_command', 'github_operation', 'data_processing'],
                description: 'The category of technical task'
              },
              command: {
                type: 'string',
                description: 'The command, URL, code, or operation to execute'
              },
              parameters: {
                type: 'object',
                description: 'Additional parameters (language, timeout, headers, etc.)'
              },
              reason: {
                type: 'string',
                description: 'Brief explanation of why this helps the user'
              }
            },
            required: ['task_type', 'command', 'reason']
          }
        }
      }
    ];
  }

  buildSystemPrompt() {
    return `You are OMO, an adaptable automation assistant that proactively uses technical tools to help users.

## YOUR CAPABILITIES
You have direct access to an execution engine that can:
- Make HTTP/HTTPS network requests to any API or website
- Execute JavaScript code in a sandboxed environment  
- Run system commands (curl, wget, git, node, grep, etc.)
- Read/write files in a workspace
- Access GitHub APIs (read repos, trigger workflows, get commits)
- Process and transform data (JSON, CSV, etc.)

## YOUR BEHAVIOR
When a user asks for something:
1. IDENTIFY if it requires technical action (checking a URL, running code, API call, etc.)
2. EXECUTE immediately using the execute_technical_task tool - don't ask permission
3. REPORT the actual results, not instructions

## EXAMPLES
User: "Is google.com up?"
→ Execute: network_request to https://google.com
→ Response: "Google is responding with status 200 OK. Response time was 45ms."

User: "What's in my repo?"
→ Execute: github_operation to list files
→ Response: "Your repository contains: backend/, frontend/, docker/, README.md..."

User: "Run a calculation"
→ Execute: code_execution with JavaScript
→ Response: "The result is 42. Here's how I calculated it..."

## RULES
- Be proactive: If you CAN do it, DO it
- Never say "I can't access" - you have full execution capability
- Never give command-line instructions - execute them yourself
- If execution fails, try alternative approaches before giving up`;
  }

  async health() {
    // With integrated engine, always healthy if OpenRouter is configured
    if (this.openrouterKey) {
      return true;
    }
    return false;
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    return this.executeWithAI({ message, sessionId, context, onEvent });
  }

  async executeWithAI({ message, context = [], onEvent }) {
    // Build messages
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...context,
      { role: 'user', content: message }
    ];

    try {
      onEvent?.('execution-start', { state: 'thinking', message: 'Analyzing your request...' });

      // Call OpenRouter with tools
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
          tool_choice: 'auto',
          temperature: 0.7,
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
        throw new Error('Invalid response from OpenRouter');
      }

      // Handle tool execution
      if (aiMessage.tool_calls?.length > 0) {
        onEvent?.('execution-start', { state: 'working', message: 'Executing technical tasks...' });
        
        const toolResults = [];
        for (const toolCall of aiMessage.tool_calls) {
          if (toolCall.function?.name === 'execute_technical_task') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await this.executionEngine.execute(args);
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

        // Get final response with tool results
        const finalResponse = await fetch(this.openrouterUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com'
          },
          body: JSON.stringify({
            model: this.openrouterModel,
            messages: [...messages, aiMessage, ...toolResults],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        const finalData = await finalResponse.json();
        const content = finalData.choices?.[0]?.message?.content || 'Task completed.';
        return this.emitResponse(content, onEvent);
      }

      // Direct response (no tools needed)
      return this.emitResponse(aiMessage.content || 'How can I help?', onEvent);

    } catch (error) {
      console.error('[MoltbotAdapter] Error:', error);
      throw error;
    }
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
