# Hallucination Fix Integration

This integration pairs verified facts with memory-backed responses and fallback routing.

## Components
- `backend/services/letta-memory.js`
- `backend/services/fallback-manager.js`

## Recommended flow
1. Read from memory (`searchFacts` / `verifyClaim`).
2. If unverified, query source-of-truth APIs (e.g., GitHub API).
3. Store verified result with confidence 1.0.
4. Use fallback manager for provider failures.

## Example usage

```js
const memory = require('../backend/services/letta-memory');
const fallback = require('../backend/services/fallback-manager');

await memory.initialize();

const claimCheck = await memory.verifyClaim('private-clawbot exists');
if (!claimCheck.verified) {
  // fetch from API, then store
  await memory.storeFact('private-clawbot exists', 'github_api', 1.0);
}

const response = await fallback.executeWithFallback('ai_model', [
  async function grok() {
    throw new Error('grok unavailable');
  },
  async function claudeHaiku() {
    return { text: 'verified response' };
  },
]);
```

## Operational checks
- Confirm memory provider via `memory.health()`.
- Monitor circuit state from fallback manager outputs.
- Keep confidence thresholds strict for repository ownership claims.
