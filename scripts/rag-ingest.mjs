#!/usr/bin/env node
// Local RAG ingestion: chunk the repo's Markdown docs, embed each chunk via Ollama,
// and write the vectors to the file-backed store. Zero API keys required.
//
// Usage: npm run rag:ingest
// Requires a running Ollama server (see OLLAMA_BASE_URL / RAG_EMBED_MODEL env vars).

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { embed } from '../server/utils/ollamaClient.js';
import { replaceAll } from '../server/utils/ragStore.js';
import { fetchWorldNews } from '../server/utils/newsFeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

async function listMarkdownFiles() {
  const rootEntries = await fs.readdir(repoRoot, { withFileTypes: true });
  const files = rootEntries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(repoRoot, entry.name));

  const guidelinesDir = path.join(repoRoot, 'guidelines');
  try {
    const guidelineEntries = await fs.readdir(guidelinesDir, { withFileTypes: true });
    guidelineEntries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .forEach(entry => files.push(path.join(guidelinesDir, entry.name)));
  } catch {
    // guidelines dir optional
  }
  return files;
}

// Pulls current world news and adds each article as its own retrievable passage.
// News failures are non-fatal — doc indexing is the primary corpus.
async function ingestNews(records) {
  let articles = [];
  try {
    const result = await fetchWorldNews({ limit: 50 });
    articles = result.articles;
  } catch (err) {
    console.warn(`Skipping news ingestion (fetch failed): ${err.message}`);
    return;
  }

  let indexed = 0;
  for (const article of articles) {
    const text = `${article.title}\n${article.description}`.trim();
    if (text.length < 20) {
      continue;
    }
    try {
      const embedding = await embed(text);
      records.push({
        id: `news:${article.id}`,
        text,
        source: `news:${article.source}`,
        embedding,
        metadata: {
          url: article.url,
          publishedAt: article.publishedAt,
          title: article.title,
        },
      });
      indexed += 1;
    } catch (err) {
      console.warn(`Failed to embed news article: ${err.message}`);
    }
  }
  console.log(`  news: ${indexed} article(s)`);
}

function chunkText(text) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    const slice = clean.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
    if (end >= clean.length) {
      break;
    }
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

// Builds the full index from docs + news and persists it. Throws on failure so
// callers (CLI or scheduler) can decide how to react.
async function runIngest() {
  const files = await listMarkdownFiles();
  if (files.length === 0) {
    throw new Error('No Markdown files found to index.');
  }

  console.log(`Indexing ${files.length} document(s)...`);
  const records = [];

  for (const file of files) {
    const source = path.relative(repoRoot, file);
    const content = await fs.readFile(file, 'utf8');
    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i += 1) {
      const text = chunks[i];
      try {
        const embedding = await embed(text);
        records.push({
          id: `${source}#${i}`,
          text,
          source,
          embedding,
          metadata: { chunkIndex: i, chars: text.length },
        });
      } catch (err) {
        throw new Error(`Failed to embed ${source} chunk ${i}: ${err.message}. Is Ollama running?`);
      }
    }
    console.log(`  ${source}: ${chunks.length} chunk(s)`);
  }

  await ingestNews(records);

  await replaceAll(records);
  console.log(`\nDone. Indexed ${records.length} chunk(s) from ${files.length} document(s).`);
  return { documents: files.length, chunks: records.length };
}

// Run directly (npm run rag:ingest) vs. imported by the scheduler.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runIngest().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

export { runIngest };
