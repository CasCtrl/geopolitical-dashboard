import env from '../config/env.js';

// Local, zero-key LLM/embedding client backed by an Ollama server.
// All calls are best-effort: callers must handle thrown errors and degrade gracefully.

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function postJson(pathname, body) {
  const url = `${env.OLLAMA_BASE_URL.replace(/\/$/, '')}${pathname}`;
  const { signal, clear } = withTimeout(env.RAG_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Ollama responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clear();
  }
}

async function embed(text) {
  const payload = await postJson('/api/embeddings', {
    model: env.RAG_EMBED_MODEL,
    prompt: text,
  });
  if (!Array.isArray(payload?.embedding)) {
    throw new Error('Ollama embedding response missing embedding array');
  }
  return payload.embedding;
}

async function chat(messages) {
  const payload = await postJson('/api/chat', {
    model: env.RAG_CHAT_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.1 },
  });
  const content = payload?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Ollama chat response missing message content');
  }
  return content;
}

async function isReachable() {
  const { signal, clear } = withTimeout(Math.min(env.RAG_TIMEOUT_MS, 3000));
  try {
    const url = `${env.OLLAMA_BASE_URL.replace(/\/$/, '')}/api/tags`;
    const response = await fetch(url, { signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clear();
  }
}

export { embed, chat, isReachable };
