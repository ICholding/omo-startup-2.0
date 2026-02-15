const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || process.env.LLM_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_MAX_CONTEXT_MESSAGES = Number(process.env.OPENROUTER_MAX_CONTEXT_MESSAGES || 12);

function hasOpenRouterConfig() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function normalizeContext(context = []) {
  if (!Array.isArray(context)) return [];

  return context
    .slice(-DEFAULT_MAX_CONTEXT_MESSAGES)
    .map((entry) => {
      const role = entry?.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof entry?.content === 'string' ? entry.content.trim() : '';
      return { role, content };
    })
    .filter((entry) => entry.content.length > 0);
}

function buildSystemPrompt() {
  return [
    'You are the Automation Assistant for the game of life.',
    'Your goal is to simplify complex tasks into automated outcomes with structured logs.',
    'Keep internal reasoning hidden and return concise user-facing summaries.',
    'When useful, include practical next actions and maintain session continuity.'
  ].join(' ');
}

async function generateOpenRouterResponse({ message, context = [] }) {
  if (!hasOpenRouterConfig()) {
    return null;
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...normalizeContext(context),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'omo-startup-chat'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.4)
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty response');
  }

  return content.trim();
}

module.exports = {
  hasOpenRouterConfig,
  generateOpenRouterResponse
};
