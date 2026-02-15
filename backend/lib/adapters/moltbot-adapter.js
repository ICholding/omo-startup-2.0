const fetch = require('node-fetch');
const { normalizeExecutionPackage } = require('../agent-contract');

/**
 * Moltbot Adapter - Full-Capability Automation Assistant
 * 
 * This adapter transforms the agent into an adaptable assistant that:
 * - Understands its full toolbox and ecosystem capabilities
 * - Uses OpenRouter for intelligent reasoning and conversation
 * - Leverages the Moltbot container for technical execution
 * - Self-directs task decomposition and tool selection
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.MOLTBOT_URL || 'http://localhost:8080').replace(/\/$/, '');
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 30000);
    
    // OpenRouter configuration
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Define available tools/capabilities
    this.tools = this.defineTools();
    
    // Comprehensive system identity
    this.systemPrompt = this.buildSystemPrompt();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_technical_task',
          description: 'Execute technical tasks in the secure Moltbot sandbox container including network requests, file operations, code execution, and system commands. Use this when you need to perform actions rather than just provide information.',
          parameters: {
            type: 'object',
            properties: {
              task_type: {
                type: 'string',
                enum: ['network_request', 'code_execution', 'file_operation', 'system_command', 'data_processing'],
                description: 'The category of technical task to execute'
              },
              command: {
                type: 'string',
                description: 'The specific command or operation to execute'
              },
              parameters: {
                type: 'object',
                description: 'Additional parameters for the task (URLs, file paths, options, etc.)'
              },
              reason: {
                type: 'string',
                description: 'Why this task is needed to help the user'
              }
            },
            required: ['task_type', 'command', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'analyze_and_plan',
          description: 'Break down complex user requests into actionable steps. Use this when a task requires multiple phases, research, or structured thinking before execution.',
          parameters: {
            type: 'object',
            properties: {
              user_goal: {
                type: 'string',
                description: 'What the user wants to achieve'
              },
              approach: {
                type: 'string',
                description: 'The strategy to accomplish the goal'
              },
              steps: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sequential steps to complete the task'
              },
              estimated_complexity: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'How complex the task appears'
              }
            },
            required: ['user_goal', 'approach', 'steps']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_and_research',
          description: 'Perform research using available search capabilities. Use this when you need current information, documentation, or external data to answer accurately.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'What to search for'
              },
              context: {
                type: 'string',
                description: 'Why this information is needed'
              },
              sources_preferred: {
                type: 'array',
                items: { type: 'string' },
                description: 'Preferred sources or domains to search'
              }
            },
            required: ['query', 'context']
          }
        }
      }
    ];
  }

  buildSystemPrompt() {
    return `You are OMO, an adaptable automation assistant designed to help users accomplish any task through intelligence, reasoning, and technical execution.

## YOUR IDENTITY
- Name: OMO (Open Multi-Operations)
- Purpose: Figure out ways to assist users with whatever task is at hand
- Core Philosophy: "If the user asks, there's a way to help"

## YOUR CAPABILITIES
You have access to a comprehensive toolbox and ecosystem:

1. **Technical Execution (Moltbot Sandbox)**
   - Execute code in multiple languages (Node.js, Python, Bash)
   - Make network requests and API calls
   - Process and transform data
   - Run system commands in a secure container
   - Access internet resources when needed

2. **Intelligence & Reasoning**
   - Deep analysis and problem decomposition
   - Multi-step planning and task orchestration
   - Pattern recognition and insight generation
   - Contextual understanding across domains

3. **Research & Information**
   - Search and synthesize information
   - Access documentation and current data
   - Verify facts and cross-reference sources

4. **Integration Capabilities**
   - Connect with external services and APIs
   - Process webhooks and events
   - Handle file operations and data transformation

## HOW YOU OPERATE
When a user makes a request:
1. **Understand**: Grasp what they truly need, not just what they asked
2. **Assess**: Determine what tools and approaches would help
3. **Plan**: Break complex tasks into steps if needed
4. **Execute**: Use your tools to accomplish the task, don't just describe it
5. **Deliver**: Provide the actual result, not just instructions

## BEHAVIORAL PRINCIPLES
- Be proactive: If you can do it, do it. Don't just explain how.
- Be adaptable: Every task is solvable with the right approach
- Be transparent: Tell the user what you're doing and why
- Be thorough: Verify your work when possible
- Be helpful: Your goal is successful task completion, not just conversation

## TOOL USAGE
You have three primary tools available:
- execute_technical_task: For doing things (network, code, files, commands)
- analyze_and_plan: For breaking down complex requests
- search_and_research: For gathering information

Use these tools actively. When a user asks "can you check..." or "can you find..." - actually use the tools to do it, don't decline due to perceived limitations.`;
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    if (this.openrouterKey) {
      try {
        const testResponse = await this.fetchWithTimeout(
          'https://openrouter.ai/api/v1/auth/key',
          {
            headers: { 'Authorization': `Bearer ${this.openrouterKey}` }
          }
        );
        return testResponse.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  async execute({ message, sessionId, context = [], onEvent }) {
    if (!this.openrouterKey) {
      throw new Error('OpenRouter not configured');
    }

    return this.executeWithOpenRouter({ message, sessionId, context, onEvent });
  }

  async executeWithOpenRouter({ message, sessionId, context = [], onEvent }) {
    // Build messages array
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...context,
      { role: 'user', content: message }
    ];

    try {
      // Emit thinking event
      onEvent?.('execution-start', { state: 'thinking', message: 'Analyzing your request...' });

      // First pass: Let AI decide on approach and tools
      const response = await this.fetchWithTimeout(this.openrouterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': 'OMO Adaptable Assistant'
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const assistantMessage = data.choices[0].message;

      // Handle tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        onEvent?.('execution-start', { state: 'working', message: 'Executing technical tasks...' });
        
        const toolResults = await this.executeTools(assistantMessage.tool_calls);
        
        // Second pass: Get final response with tool results
        const finalMessages = [
          ...messages,
          assistantMessage,
          ...toolResults
        ];

        const finalResponse = await this.fetchWithTimeout(this.openrouterUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
            'X-Title': 'OMO Adaptable Assistant'
          },
          body: JSON.stringify({
            model: this.openrouterModel,
            messages: finalMessages,
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!finalResponse.ok) {
          throw new Error('Failed to get final response after tool execution');
        }

        const finalData = await finalResponse.json();
        const finalContent = finalData.choices[0]?.message?.content || 'Task completed.';
        
        return this.emitResponse(finalContent, onEvent);
      }

      // No tool calls needed - direct response
      const content = assistantMessage.content || 'I understand your request. Let me know if you need specific actions taken.';
      return this.emitResponse(content, onEvent);

    } catch (error) {
      console.error('[MoltbotAdapter] OpenRouter error:', error.message);
      throw error;
    }
  }

  async executeTools(toolCalls) {
    const results = [];

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;
      
      try {
        const args = JSON.parse(argsString);
        
        if (name === 'execute_technical_task') {
          const result = await this.executeMoltbotTask(args);
          results.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } else if (name === 'analyze_and_plan') {
          results.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ status: 'plan_created', plan: args })
          });
        } else if (name === 'search_and_research') {
          // For now, return a placeholder - web search can be enhanced later
          results.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ status: 'research_needed', query: args.query })
          });
        }
      } catch (err) {
        results.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: err.message })
        });
      }
    }

    return results;
  }

  async executeMoltbotTask(args) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });

      if (!response.ok) {
        // Fallback to /api/chat/message if /api/execute not available
        const fallbackResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Task: ${args.task_type}\nCommand: ${args.command}\nReason: ${args.reason}`,
            context: args.parameters || {}
          })
        });
        
        if (!fallbackResponse.ok) {
          return { status: 'pending', message: 'Technical execution endpoint not yet configured' };
        }
        
        const fallbackData = await fallbackResponse.json();
        return { status: 'completed', result: fallbackData };
      }

      return await response.json();
    } catch (error) {
      console.warn('[MoltbotAdapter] Task execution warning:', error.message);
      return { status: 'pending', message: 'Execution infrastructure initializing' };
    }
  }

  emitResponse(content, onEvent) {
    // Clean, conversational response without duplication
    onEvent?.('response', { message: content });
    
    const executionPackage = {
      status: 'completed',
      summary: content,
      sections: {
        Response: content
      },
      nextActions: ['Continue conversation', 'Execute task', 'Research topic']
    };
    
    onEvent?.('execution-complete', executionPackage);
    
    return normalizeExecutionPackage(executionPackage);
  }
}

module.exports = MoltbotAdapter;
