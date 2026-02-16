const axios = require('axios');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OpenRouter Service
 * Provides conversational AI responses using OpenRouter API
 */
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.primaryModel = process.env.PRIMARY_MODEL || process.env.OPENROUTER_MODEL || 'x-ai/grok-code-fast-1';
    this.fallbackModel = process.env.FALLBACK_MODEL || 'openai/gpt-4o-mini';
    
    if (!this.apiKey) {
      console.warn('[OpenRouter] Warning: OPENROUTER_API_KEY not set');
    }
  }

  async chatCompletion({ model, messages, timeoutMs = 60000 }) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': process.env.APP_NAME || 'OMO Clawbot'
        }
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty model response');
    }

    return content;
  }

  async generateResponse(message, context = [], modeContext = {}) {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = modeContext.model || this.primaryModel;
    
    // Build messages array from context
    const messages = [
      {
        role: 'system',
        content: 'You are OMO, ICholding\'s AI assistant powered by Claude via OpenRouter. Provide helpful, conversational responses. Do not claim to be GPT-4 or any OpenAI model.'
      },
      ...context,
      { role: 'user', content: message }
    ];

    const attempts = [
      { model, retries: 2 },
      { model: this.fallbackModel, retries: 1 }
    ];

    let lastError = null;

    for (const attempt of attempts) {
      for (let index = 0; index <= attempt.retries; index += 1) {
        try {
          return await this.chatCompletion({
            model: attempt.model,
            messages,
            timeoutMs: 60000
          });
        } catch (error) {
          lastError = error;
          const status = error?.response?.status;
          const details = error?.response?.data || error?.message;
          console.error(`[OpenRouter] model=${attempt.model} attempt=${index + 1} failed`, status, details);
          await sleep(400 * (index + 1));
        }
      }
    }

    console.error('[OpenRouter] Final failure after retries:', lastError?.message);
    return '⚠️ The AI service is temporarily unavailable. Please try again.';
  }
}

module.exports = new OpenRouterService();
