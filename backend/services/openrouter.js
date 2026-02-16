const axios = require('axios');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  async chatOpenRouter({ model, messages, timeoutMs = 60000 }) {
    if (!this.apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY');
    }

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      { model, messages },
      {
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || process.env.OPENROUTER_REFERER || '',
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
    const primaryModel = modeContext.model || this.primaryModel;
    const messages = [
      {
        role: 'system',
        content:
          'You are Clawbot, a concise and helpful AI assistant. Provide direct answers and avoid exposing backend internals.'
      },
      ...context,
      { role: 'user', content: message }
    ];

    const attempts = [
      { model: primaryModel, retries: 2 },
      { model: this.fallbackModel, retries: 1 }
    ];

    let lastError = null;

    for (const attempt of attempts) {
      for (let i = 0; i <= attempt.retries; i += 1) {
        try {
          return await this.chatOpenRouter({
            model: attempt.model,
            messages,
            timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10) || 60000
          });
        } catch (error) {
          lastError = error;
          const status = error?.response?.status;
          console.error(
            `[OpenRouter] model=${attempt.model} attempt=${i + 1} failed`,
            status,
            error?.response?.data || error?.message
          );
          await sleep(400 * (i + 1));
        }
      }
    }

    console.error('[OpenRouter] All model attempts failed:', lastError?.message || 'Unknown error');
    return '⚠️ The AI service is temporarily unavailable. Please try again.';
  }
}

module.exports = new OpenRouterService();
