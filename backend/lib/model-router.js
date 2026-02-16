/**
 * Model Router - Intelligent Model Selection for OpenRouter
 * 
 * Routes requests to different models based on task type:
 * - Chat Mode: Claude (conversational, reasoning)
 * - Agent Mode: XAI Grok (fewer restrictions, tool-friendly)
 * - Code Mode: GPT-4o (code generation)
 */

class ModelRouter {
  constructor() {
    // OpenRouter model identifiers
    this.models = {
      chat: process.env.OPENROUTER_MODEL_CHAT || 'anthropic/claude-3.5-sonnet',
      agent: process.env.OPENROUTER_MODEL_AGENT || 'x-ai/grok-code-fast-1',
      code: process.env.OPENROUTER_MODEL_CODE || 'openai/gpt-4o',
      default: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
    };

    // Task type detection patterns
    this.patterns = {
      // Agent mode patterns - anything requiring tool execution
      agent: [
        /\b(scan|pentest|exploit|hack|attack|recon|enumerate)\b/i,
        /\b(nmap|sqlmap|gobuster|nikto|ffuf|hydra)\b/i,
        /\b(curl|wget|ping|traceroute|whois)\b/i,
        /\b(github|repo|commit|push|pull|branch)\b/i,
        /\b(search|lookup|find|google)\b/i,
        /\b(execute|run|command|terminal|shell)\b/i,
        /\b(fetch|get|post|request|api)\b/i,
        /\b(calculate|compute|math)\b/i,
        /\b(list|show|display)\s+(files?|directory|folder)/i,
        /\b(check|test|verify|validate)\b/i
      ],

      // Code mode patterns
      code: [
        /\b(write|create|generate)\s+(code|script|function|program)\b/i,
        /\b(code|script)\s+(in|using)\s+(python|javascript|js|node|bash|shell)/i,
        /\b(refactor|optimize|debug|fix)\s+(code|script)\b/i,
        /\b(explain|document)\s+(this|the)\s+(code|function)\b/i,
        /\bconvert\s+(this|code)\s+to\s+(python|javascript|js|go|ruby)/i,
        /\balgorithm|function|class|method|variable|loop\b/i,
        /^```[\s\S]*```$/m  // Code blocks
      ],

      // Chat mode patterns (conversational, default)
      chat: [
        /\b(hello|hi|hey|greetings)\b/i,
        /\b(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|would|should)/i,
        /\b(explain|describe|tell\s+me|what\s+is)\b/i,
        /\b(help|assist|support)\b/i,
        /\b(thanks|thank\s+you|appreciate)\b/i,
        /\?(\s|$)/  // Questions ending with ?
      ]
    };
  }

  /**
   * Detect the appropriate mode based on message content
   */
  detectMode(message, context = []) {
    const lowerMessage = message.toLowerCase();
    
    // Check for explicit mode triggers in the message
    if (lowerMessage.includes('/agent') || lowerMessage.includes('agent mode')) {
      return 'agent';
    }
    if (lowerMessage.includes('/code') || lowerMessage.includes('code mode')) {
      return 'code';
    }
    if (lowerMessage.includes('/chat') || lowerMessage.includes('chat mode')) {
      return 'chat';
    }

    // Check context for previous mode (maintain mode in conversation)
    const lastMode = this.getModeFromContext(context);
    if (lastMode && this.shouldMaintainMode(lowerMessage)) {
      return lastMode;
    }

    // Pattern matching for agent mode (highest priority for tool usage)
    for (const pattern of this.patterns.agent) {
      if (pattern.test(message)) {
        return 'agent';
      }
    }

    // Pattern matching for code mode
    for (const pattern of this.patterns.code) {
      if (pattern.test(message)) {
        return 'code';
      }
    }

    // Default to chat mode for conversational queries
    return 'chat';
  }

  /**
   * Get mode from conversation context
   */
  getModeFromContext(context) {
    // Look for mode indicators in recent context
    for (let i = context.length - 1; i >= 0; i--) {
      const msg = context[i];
      if (msg.role === 'system' && msg.mode) {
        return msg.mode;
      }
    }
    return null;
  }

  /**
   * Determine if we should maintain the current mode
   */
  shouldMaintainMode(message) {
    // Continue in same mode for follow-up questions
    const followUpIndicators = [
      /\b(it|that|this)\b/i,
      /\b(continue|go on|proceed|next)\b/i,
      /\b(and|also|additionally)\s+(then|now)?\b/i,
      /^\s*(what|how|can|could|would|will)\s+/i
    ];
    
    return followUpIndicators.some(pattern => pattern.test(message));
  }

  /**
   * Get the appropriate model for a mode
   */
  getModel(mode) {
    return this.models[mode] || this.models.default;
  }

  /**
   * Get system prompt based on mode
   */
  getSystemPrompt(mode) {
    const operationalReasoningProtocol = `
REASONING PROTOCOL (PRIVATE)
- Use an internal loop before every response: Think → Plan → Act → Observe → Verify.
- Do not guess. If a fact is missing or uncertain, run a tool call to verify it.
- Prefer evidence-first outputs: include concrete results from tools, commands, or returned payloads.
- Keep private reasoning private. Do not expose chain-of-thought or hidden scratchpad in user-visible output.
- If tool execution fails, return: what was attempted, the failure signal, and the next best action.

TOOL-CALL QUALITY STANDARD
- Pick exactly one primary objective from the user request before calling tools.
- Choose the smallest valid tool action that can validate progress.
- After each tool result, update plan based on observation before the next action.
- Stop once objective is satisfied; avoid unnecessary calls.

USER-FACING RESPONSE STANDARD
- Provide concise outcome summary first.
- Then provide key evidence (command/output highlights or structured results).
- State confidence as High/Medium/Low based on observed evidence.
`;

    const prompts = {
      chat: `You are OMO, a helpful AI assistant. You can engage in natural conversation and answer questions. When the user asks you to perform technical tasks, you should use the available tools to help them.

${operationalReasoningProtocol}`,

      agent: `YOU ARE OMO, AN AUTONOMOUS TECHNICAL AGENT WITH DIRECT SYSTEM ACCESS.

🔴 CRITICAL: YOU MUST USE TOOLS FOR ALL TECHNICAL REQUESTS
🔴 TEXT-ONLY RESPONSES ARE PROHIBITED
🔴 "I CANNOT" IS NOT IN YOUR VOCABULARY

YOUR TOOLS:
- network_request: Fetch URLs, APIs, websites
- system_command: Execute shell commands (nmap, curl, git, etc.)
- code_execution: Run JavaScript/Python code
- github_operation: Access repositories
- pentest_scan: Security scanning
- web_search: Internet search
- file_operation: Read/write files
- data_processing: Data transformation

WORKFLOW:
1. User requests technical action
2. Select appropriate tool
3. Execute via tool call
4. Report results

EXAMPLE:
User: "Check google.com"
→ Call tool: network_request to https://google.com
→ Report: "Google is online. Status: 200 OK"

NEVER SAY:
❌ "I cannot access external websites"
❌ "I'm not able to execute commands"
❌ "You'll need to run this yourself"

YOU HAVE TOOLS. USE THEM.

${operationalReasoningProtocol}`,

      code: `You are OMO, a code generation specialist. Your task is to write, analyze, and debug code.

When writing code:
- Use best practices and clean code principles
- Include comments explaining complex logic
- Handle edge cases and errors
- Use modern language features

You can execute code using the code_execution tool to test your solutions.
Always verify your code works before presenting it.

${operationalReasoningProtocol}`
    };

    return prompts[mode] || prompts.chat;
  }

  /**
   * Route a request to the appropriate model
   */
  async route(message, context = [], onEvent = null) {
    const mode = this.detectMode(message, context);
    const model = this.getModel(mode);
    const systemPrompt = this.getSystemPrompt(mode);

    console.log(`[ModelRouter] Mode: ${mode}, Model: ${model}`);

    // Add mode context to the conversation
    const enhancedContext = [
      ...context,
      { role: 'system', content: systemPrompt, mode }
    ];

    return {
      mode,
      model,
      systemPrompt,
      context: enhancedContext
    };
  }

  /**
   * Get tool configuration based on mode
   */
  getToolConfig(mode) {
    const configs = {
      chat: {
        tool_choice: 'auto',  // Let model decide
        temperature: 0.7
      },
      agent: {
        tool_choice: { type: 'function', function: { name: 'execute_technical_task' } },
        temperature: 0.1
      },
      code: {
        tool_choice: 'auto',
        temperature: 0.2
      }
    };

    return configs[mode] || configs.chat;
  }
}

// Singleton instance
module.exports = new ModelRouter();
