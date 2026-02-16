const fetch = require('node-fetch');

/**
 * OpenRouter Service
 * Provides conversational AI responses using OpenRouter API
 */
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    
    if (!this.apiKey) {
      console.warn('[OpenRouter] Warning: OPENROUTER_API_KEY not set');
    }
  }

  async generateResponse(message, context = [], modeContext = {}) {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = modeContext.model || this.model;
    
    // Build messages array from context
    const messages = [
      {
        role: 'system',
        content: 'You are OMO, ICholding\'s AI assistant powered by Claude via OpenRouter. Provide helpful, conversational responses. Do not claim to be GPT-4 or any OpenAI model.'
      },
      ...context,
      { role: 'user', content: message }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://omo-startup.onrender.com',
          'X-Title': 'OMO Startup Assistant'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('[OpenRouter] Error:', error.message);
      throw error;
    }
  }
}

module.exports = new OpenRouterService();
