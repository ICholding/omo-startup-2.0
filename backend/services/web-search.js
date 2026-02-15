const DEFAULT_TIMEOUT_MS = 8000;

const withTimeout = async (promise, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Search timed out')), timeoutMs);
  });

  return Promise.race([promise, timeout]);
};

const shouldSearchWeb = (query = '') => {
  const normalized = query.toLowerCase();
  const triggers = [
    'latest',
    'current',
    'today',
    'news',
    'trend',
    'weather',
    'price',
    'stock',
    '2026'
  ];

  return triggers.some((trigger) => normalized.includes(trigger));
};

const searchDuckDuckGo = async (query) => {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const response = await withTimeout(fetch(url));

  if (!response.ok) {
    throw new Error(`DuckDuckGo error: ${response.status}`);
  }

  const data = await response.json();
  const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
  const fallbackRelated = related.find((item) => item?.Text)?.Text || null;

  return {
    source: 'duckduckgo',
    title: data?.Heading || null,
    snippet: data?.AbstractText || fallbackRelated || null,
    url: data?.AbstractURL || null
  };
};

const searchGoogleCustom = async (query) => {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return null;
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(searchEngineId)}&q=${encodeURIComponent(query)}&num=3`;
  const response = await withTimeout(fetch(url));

  if (!response.ok) {
    throw new Error(`Google search error: ${response.status}`);
  }

  const data = await response.json();
  const firstItem = Array.isArray(data?.items) ? data.items[0] : null;

  if (!firstItem) {
    return null;
  }

  return {
    source: 'google',
    title: firstItem.title || null,
    snippet: firstItem.snippet || null,
    url: firstItem.link || null
  };
};

const synthesizeSearchSummary = (query, results = []) => {
  const lines = [`I checked backend search sources for: "${query}".`];

  results.forEach((result) => {
    if (!result?.snippet) return;

    lines.push(`- ${result.source.toUpperCase()}: ${result.snippet}`);
    if (result.url) {
      lines.push(`  Source: ${result.url}`);
    }
  });

  lines.push('If you want, I can do a deeper follow-up focused on one specific angle.');
  return lines.join('\n');
};

const searchAndSynthesize = async (query) => {
  if (!shouldSearchWeb(query)) {
    return null;
  }

  const [googleResult, duckResult] = await Promise.allSettled([
    searchGoogleCustom(query),
    searchDuckDuckGo(query)
  ]);

  const merged = [];

  if (googleResult.status === 'fulfilled' && googleResult.value) {
    merged.push(googleResult.value);
  }

  if (duckResult.status === 'fulfilled' && duckResult.value) {
    merged.push(duckResult.value);
  }

  if (!merged.length) {
    return null;
  }

  return {
    usedWebSearch: true,
    sources: merged,
    summary: synthesizeSearchSummary(query, merged)
  };
};

module.exports = {
  shouldSearchWeb,
  searchAndSynthesize
};
