import { getApiUrl } from '../config/api';

/**
 * OMO Runtime Adapter for assistant-ui
 * 
 * Bridges assistant-ui's chat runtime with OMO's custom execution engine.
 * Maintains all existing functionality: SSE streaming, tool execution, 
 * pause/resume, and session management.
 */
export class OmoAdapter {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.abortController = null;
    this.streamRef = null;
  }

  async *run({ messages, abortSignal }) {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      throw new Error('No message content provided');
    }

    // Build context from previous messages
    const context = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    // Create abort controller for this request
    this.abortController = new AbortController();
    
    // Link external abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        this.abortController.abort();
      });
    }

    const params = new URLSearchParams({
      sessionId: this.sessionId,
      message: lastMessage.content,
      context: JSON.stringify(context)
    });

    try {
      const stream = new EventSource(getApiUrl(`/api/chat/stream?${params.toString()}`));
      this.streamRef = stream;

      // Create a promise-based event listener
      const eventQueue = [];
      let resolveNext = null;
      let isDone = false;
      let error = null;

      const pushEvent = (event) => {
        if (resolveNext) {
          resolveNext(event);
          resolveNext = null;
        } else {
          eventQueue.push(event);
        }
      };

      stream.onopen = () => {
        pushEvent({ type: 'open' });
      };

      stream.addEventListener('execution-start', (event) => {
        const data = JSON.parse(event.data || '{}');
        pushEvent({ type: 'status', status: data.state || 'thinking', message: data.message });
      });

      stream.addEventListener('response', (event) => {
        const data = JSON.parse(event.data || '{}');
        if (data.message) {
          pushEvent({ type: 'content', content: data.message });
        }
      });

      stream.addEventListener('execution-complete', (event) => {
        const data = JSON.parse(event.data || '{}');
        pushEvent({ type: 'complete', data });
        isDone = true;
      });

      stream.addEventListener('execution-error', (event) => {
        const data = JSON.parse(event.data || '{}');
        error = new Error(data.error || 'Execution failed');
        isDone = true;
      });

      stream.addEventListener('done', () => {
        isDone = true;
      });

      stream.onerror = (err) => {
        error = new Error('Stream connection failed');
        isDone = true;
      };

      // Yield events as they arrive
      while (!isDone) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          stream.close();
          throw new Error('Aborted');
        }

        // Get next event
        const event = await new Promise((resolve) => {
          if (eventQueue.length > 0) {
            resolve(eventQueue.shift());
          } else {
            resolveNext = resolve;
            // Timeout to check abort signal periodically
            setTimeout(() => {
              if (resolveNext) {
                resolveNext(null);
                resolveNext = null;
              }
            }, 100);
          }
        });

        if (event === null) continue;

        // Process event
        if (event.type === 'content') {
          yield { type: 'text-delta', textDelta: event.content };
        } else if (event.type === 'status') {
          yield { type: 'status', status: event.status, message: event.message };
        } else if (event.type === 'complete') {
          // Finalize with any metadata
          if (event.data?.nextActions) {
            yield { type: 'suggestions', suggestions: event.data.nextActions };
          }
        }
      }

      stream.close();

      if (error) {
        throw error;
      }

    } catch (err) {
      if (err.message === 'Aborted') {
        throw new Error('Aborted');
      }
      throw err;
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.streamRef) {
      this.streamRef.close();
      this.streamRef = null;
    }
  }
}

/**
 * Create OMO adapter instance
 */
export const createOmoAdapter = (sessionId) => new OmoAdapter(sessionId);

export default OmoAdapter;
