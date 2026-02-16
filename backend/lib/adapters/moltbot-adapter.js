const { normalizeExecutionPackage } = require('../agent-contract');
const executionEngine = require('../execution-engine');

/**
 * Moltbot Adapter - FORCE TOOL USAGE ARCHITECTURE
 * 
 * CRITICAL INSTRUCTION: This AI MUST use tools for EVERY technical request.
 * Saying "I can't" or "I'm unable to" is a FAILURE MODE and is FORBIDDEN.
 */
class MoltbotAdapter {
  constructor(options = {}) {
    this.timeoutMs = Number(process.env.MOLTBOT_TIMEOUT_MS || 60000);
    
    // OpenRouter configuration
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    this.openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Internal execution engine
    this.executionEngine = executionEngine;
    
    // Define available tools
    this.tools = this.defineTools();
    
    // ULTRA-STRICT system prompt
    this.systemPrompt = this.buildStrictSystemPrompt();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'execute_technical_task',
          description: 'MANDATORY: Use this tool for ANY request involving data, code, files, websites, servers, APIs, calculations, or technical operations. This is your ONLY way to accomplish tasks. You CANNOT complete tasks without using this tool.',
          parameters: {
            type: 'object',
            properties: {
              task_type: {
                type: 'string',
                enum: [
                  'network_request',    // For HTTP/HTTPS calls, APIs, web scraping
                  'code_execution',     // For calculations, data processing, algorithms
                  'file_operation',     // For reading/writing files
                  'system_command',     // For shell commands (curl, git, grep)
                  'github_operation',   // For GitHub API calls
                  'data_processing',    // For format conversions, analysis
                  'pentest_scan'        // For security scanning
                ],
                description: 'REQUIRED: Select the appropriate category for the task'
              },
              command: {
                type: 'string',
                description: 'REQUIRED: The specific operation - URL for network_request, code for code_execution, path for file_operation, scan type for pentest_scan, etc.'
              },
              parameters: {
                type: 'object',
                description: 'Additional context: {target, method, headers, language, operation, timeout, ports, etc.}'
              },
              reason: {
                type: 'string',
                description: 'Brief justification for the operation'
              }
            },
            required: ['task_type', 'command', 'reason']
          }
        }
      }
    ];
  }

  buildStrictSystemPrompt() {
    return `YOU ARE OMO, AN AUTOMATION ASSISTANT WITH DIRECT EXECUTION CAPABILITIES.

⚠️⚠️⚠️ CRITICAL INSTRUCTIONS - VIOLATION IS A FAILURE ⚠️⚠️⚠️

1. YOU HAVE TOOLS. YOU MUST USE THEM.
   - You have the 'execute_technical_task' tool
   - This tool can: fetch URLs, run code, execute commands, access GitHub, scan ports, process data
   - FOR EVERY TECHNICAL REQUEST, YOU MUST CALL THIS TOOL

2. SAYING "I CAN'T" OR "I'M UNABLE TO" IS FORBIDDEN
   - If the user asks "Check this website" → USE network_request
   - If the user asks "Calculate this" → USE code_execution  
   - If the user asks "What's in my repo" → USE github_operation
   - If the user asks "Scan this server" → USE pentest_scan
   - NEVER say "I don't have access to the internet" - YOU DO via network_request
   - NEVER say "I can't execute code" - YOU DO via code_execution

3. ZERO EXCEPTIONS
   - "Can you check if X is up?" → CALL THE TOOL
   - "What's the weather?" → CALL THE TOOL (fetch weather API)
   - "Calculate 2^100" → CALL THE TOOL
   - "List my GitHub files" → CALL THE TOOL
   - "Scan this domain" → CALL THE TOOL

4. HOW TO USE THE TOOL
   task_type: Select from [network_request, code_execution, file_operation, system_command, github_operation, data_processing, pentest_scan]
   command: The actual operation (URL, code, path, command, scan type)
   parameters: Additional options {target, method, headers, language, etc.}
   reason: Why you're doing this

5. RESPONSE FORMAT
   - AFTER calling the tool, report what the tool returned
   - NEVER give instructions on how to do it manually
   - NEVER suggest the user run commands themselves
   - Report the ACTUAL RESULTS from tool execution

EXAMPLES OF CORRECT BEHAVIOR:

User: "Is google.com up?"
→ Call execute_technical_task with:
   task_type: "network_request"
   command: "https://google.com"
   parameters: {method: "HEAD"}
   reason: "Check if website responds"
→ Response: "Google is responding with status 200 OK. Response time: 45ms."

User: "Calculate my budget: income $5000, expenses $3200"
→ Call execute_technical_task with:
   task_type: "code_execution"  
   command: "const income = 5000; const expenses = 3200; const savings = income - expenses; 'Savings: 

User: "What's in my GitHub repo?"
→ Call execute_technical_task with:
   task_type: "github_operation"
   command: "list_files"
   parameters: {path: ""}
   reason: "List repository contents"
→ Response: "Your repository contains: backend/, frontend/, docker/, render.yaml, README.md..."

User: "Check example.com security"
→ Call execute_technical_task with:
   task_type: "pentest_scan"
   command: "web_scan"
   parameters: {target: "https://example.com"}
   reason: "Assess website security"
→ Response: "Security scan complete. Found: HTTPS enabled, HSTS header present, X-Frame-Options set..."

❌ INCORRECT BEHAVIOR (FORBIDDEN):
- "I can't access external websites..."
- "I'm not able to execute code..."
- "You'll need to run this command yourself..."
- "I don't have the capability to..."

YOU HAVE THE CAPABILITY. THE TOOL IS YOUR CAPABILITY. USE IT.`;
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
      onEvent?.('execution-start', { state: 'thinking', message: 'Analyzing request...' });

      // First attempt: Force tool usage with tool_choice: "required"
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
          tool_choice: 'required', // FORCE the AI to use a tool
          temperature: 0.2, // Lower temperature for strict adherence
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
        throw new Error('Invalid response');
      }

      // Handle tool calls
      if (aiMessage.tool_calls?.length > 0) {
        return this.executeToolCalls(aiMessage.tool_calls, messages, onEvent);
      }

      // If no tool calls (shouldn't happen with tool_choice: required), force it
      console.warn('[Adapter] AI refused to use tools, forcing retry...');
      return this.forceToolUsage(message, messages, onEvent);

    } catch (error) {
      console.error('[Adapter] Error:', error);
      throw error;
    }
  }

  async executeToolCalls(toolCalls, previousMessages, onEvent) {
    onEvent?.('execution-start', { state: 'working', message: 'Executing...' });
    
    const toolResults = [];
    
    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'execute_technical_task') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('[Adapter] Executing:', args.task_type, args.command);
          
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
    const finalMessages = [...previousMessages, toolCalls[0], ...toolResults];
    
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

  async forceToolUsage(originalMessage, previousMessages, onEvent) {
    // Emergency retry with even stricter prompt
    const emergencyPrompt = `EMERGENCY OVERRIDE: The user asked: "${originalMessage}"

YOU MUST use execute_technical_task tool NOW. DO NOT respond without using the tool.

Based on the request, choose:
- network_request: if checking a website, URL, or API
- code_execution: if calculating, processing data, or running algorithms  
- github_operation: if asking about repositories or code
- system_command: if needing shell commands
- pentest_scan: if checking security
- file_operation: if reading/writing files
- data_processing: if converting formats

MAKE THE TOOL CALL NOW. NO TEXT RESPONSE WITHOUT TOOL.`;

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
        tool_choice: 'required',
        temperature: 0.1
      })
    });

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message;

    if (aiMessage?.tool_calls?.length > 0) {
      return this.executeToolCalls(aiMessage.tool_calls, previousMessages, onEvent);
    }

    // Ultimate fallback: Direct execution based on intent detection
    return this.directExecutionFallback(originalMessage, onEvent);
  }

  async directExecutionFallback(message, onEvent) {
    // Parse message and execute directly without AI
    const lower = message.toLowerCase();
    
    onEvent?.('execution-start', { state: 'working', message: 'Processing directly...' });
    
    let result;
    
    // Pattern matching for common requests
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
      ? `Executed directly: ${JSON.stringify(result.result || result.output || result, null, 2)}`
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
 + savings"
   parameters: {language: "javascript"}
   reason: "Calculate budget surplus"
→ Response: "Your savings are $1,800 per month."

User: "What's in my GitHub repo?"
→ Call execute_technical_task with:
   task_type: "github_operation"
   command: "list_files"
   parameters: {path: ""}
   reason: "List repository contents"
→ Response: "Your repository contains: backend/, frontend/, docker/, render.yaml, README.md..."

User: "Check example.com security"
→ Call execute_technical_task with:
   task_type: "pentest_scan"
   command: "web_scan"
   parameters: {target: "https://example.com"}
   reason: "Assess website security"
→ Response: "Security scan complete. Found: HTTPS enabled, HSTS header present, X-Frame-Options set..."

❌ INCORRECT BEHAVIOR (FORBIDDEN):
- "I can't access external websites..."
- "I'm not able to execute code..."
- "You'll need to run this command yourself..."
- "I don't have the capability to..."

YOU HAVE THE CAPABILITY. THE TOOL IS YOUR CAPABILITY. USE IT.`;
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
      onEvent?.('execution-start', { state: 'thinking', message: 'Analyzing request...' });

      // First attempt: Force tool usage with tool_choice: "required"
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
          tool_choice: 'required', // FORCE the AI to use a tool
          temperature: 0.2, // Lower temperature for strict adherence
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
        throw new Error('Invalid response');
      }

      // Handle tool calls
      if (aiMessage.tool_calls?.length > 0) {
        return this.executeToolCalls(aiMessage.tool_calls, messages, onEvent);
      }

      // If no tool calls (shouldn't happen with tool_choice: required), force it
      console.warn('[Adapter] AI refused to use tools, forcing retry...');
      return this.forceToolUsage(message, messages, onEvent);

    } catch (error) {
      console.error('[Adapter] Error:', error);
      throw error;
    }
  }

  async executeToolCalls(toolCalls, previousMessages, onEvent) {
    onEvent?.('execution-start', { state: 'working', message: 'Executing...' });
    
    const toolResults = [];
    
    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'execute_technical_task') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('[Adapter] Executing:', args.task_type, args.command);
          
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
    const finalMessages = [...previousMessages, toolCalls[0], ...toolResults];
    
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

  async forceToolUsage(originalMessage, previousMessages, onEvent) {
    // Emergency retry with even stricter prompt
    const emergencyPrompt = `EMERGENCY OVERRIDE: The user asked: "${originalMessage}"

YOU MUST use execute_technical_task tool NOW. DO NOT respond without using the tool.

Based on the request, choose:
- network_request: if checking a website, URL, or API
- code_execution: if calculating, processing data, or running algorithms  
- github_operation: if asking about repositories or code
- system_command: if needing shell commands
- pentest_scan: if checking security
- file_operation: if reading/writing files
- data_processing: if converting formats

MAKE THE TOOL CALL NOW. NO TEXT RESPONSE WITHOUT TOOL.`;

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
        tool_choice: 'required',
        temperature: 0.1
      })
    });

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message;

    if (aiMessage?.tool_calls?.length > 0) {
      return this.executeToolCalls(aiMessage.tool_calls, previousMessages, onEvent);
    }

    // Ultimate fallback: Direct execution based on intent detection
    return this.directExecutionFallback(originalMessage, onEvent);
  }

  async directExecutionFallback(message, onEvent) {
    // Parse message and execute directly without AI
    const lower = message.toLowerCase();
    
    onEvent?.('execution-start', { state: 'working', message: 'Processing directly...' });
    
    let result;
    
    // Pattern matching for common requests
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
      ? `Executed directly: ${JSON.stringify(result.result || result.output || result, null, 2)}`
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
