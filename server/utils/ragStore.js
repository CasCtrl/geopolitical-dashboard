import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';

// Minimal file-backed vector store. Records: { id, text, source, embedding: number[], metadata }.
// Cosine similarity search runs in-memory. Suitable for the modest doc corpus this app indexes.

let cache = null;
// Tracks the mtime of the loaded file so a long-running server picks up an index rebuilt
// by a separate process (rag:ingest / scheduler) without needing a restart.
let cacheMtimeMs = 0;

async function ensureDir() {
  await fs.mkdir(path.dirname(env.RAG_STORE_PATH), { recursive: true });
}

async function load() {
  let stat;
  try {
    stat = await fs.stat(env.RAG_STORE_PATH);
  } catch {
    // No index file yet — treat as empty but allow a later reload once it appears.
    if (!cache) {
      cache = [];
    }
    return cache;
  }

  if (cache && stat.mtimeMs <= cacheMtimeMs) {
    return cache;
  }

  try {
    const raw = await fs.readFile(env.RAG_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed?.records) ? parsed.records : [];
    cacheMtimeMs = stat.mtimeMs;
  } catch {
    if (!cache) {
      cache = [];
    }
  }
  return cache;
}

async function persist(records) {
  await ensureDir();
  const tmp = `${env.RAG_STORE_PATH}.tmp`;
  const payload = JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), records });
  await fs.writeFile(tmp, payload, 'utf8');
  await fs.rename(tmp, env.RAG_STORE_PATH);
  cache = records;
  try {
    const stat = await fs.stat(env.RAG_STORE_PATH);
    cacheMtimeMs = stat.mtimeMs;
  } catch {
    cacheMtimeMs = Date.now();
  }
}

async function replaceAll(records) {
  await persist(records);
}

async function count() {
  const records = await load();
  return records.length;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function search(queryEmbedding, topK = 4) {
  const records = await load();
  return records
    .map(record => ({ record, score: cosineSimilarity(queryEmbedding, record.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ record, score }) => ({
      id: record.id,
      text: record.text,
      source: record.source,
      metadata: record.metadata ?? {},
      score,
    }));
}

export { load, replaceAll, count, search };
