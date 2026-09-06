#!/usr/bin/env node
// Periodic RAG re-ingestion so news stays fresh. Runs one ingest immediately, then
// repeats on RAG_REINGEST_INTERVAL_MS. Failures are logged and retried on the next tick
// rather than crashing the scheduler.
//
// Usage: npm run rag:schedule

import env from '../server/config/env.js';
import { runIngest } from './rag-ingest.mjs';

let running = false;

async function tick() {
  if (running) {
    console.warn('Previous ingest still running; skipping this tick.');
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const summary = await runIngest();
    console.log(
      `[rag-scheduler] ingest complete in ${Date.now() - startedAt}ms ` +
      `(${summary.chunks} chunks / ${summary.documents} docs).`
    );
  } catch (err) {
    console.error(`[rag-scheduler] ingest failed: ${err.message}`);
  } finally {
    running = false;
  }
}

const intervalMs = env.RAG_REINGEST_INTERVAL_MS;
console.log(`[rag-scheduler] starting; interval ${intervalMs}ms.`);

await tick();
const timer = setInterval(tick, intervalMs);

function shutdown(signal) {
  console.log(`[rag-scheduler] received ${signal}, stopping.`);
  clearInterval(timer);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
