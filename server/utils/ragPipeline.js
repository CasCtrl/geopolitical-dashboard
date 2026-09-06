import { embed, chat } from './ollamaClient.js';
import { search, count } from './ragStore.js';
import { buildLiveContext } from './liveContext.js';

const SYSTEM_PROMPT = [
  'You are a geopolitical-risk research assistant for an investment dashboard.',
  'Answer ONLY using the numbered context passages and any live portfolio data provided.',
  'If the context does not contain the answer, say you do not have enough indexed information.',
  'Cite the passages you use with their [n] markers. Do not give financial advice.',
].join(' ');

function buildUserPrompt(question, passages, liveContext) {
  const context = passages
    .map((p, i) => `[${i + 1}] (source: ${p.source})\n${p.text}`)
    .join('\n\n');
  const live = liveContext ? `Live portfolio data:\n${liveContext}\n\n` : '';
  return `${live}Context passages:\n${context}\n\nQuestion: ${question}\n\nAnswer using only the information above and cite sources as [n].`;
}

// Runs the retrieve -> augment -> generate loop, optionally enriched with live portfolio
// state. Throws on backend failure so the caller can emit a graceful fallback response.
async function query(question, { topK = 4, datasetId } = {}) {
  const indexed = await count();
  if (indexed === 0) {
    return { answer: null, sources: [], indexed, reason: 'empty_index' };
  }

  const [questionEmbedding, liveContext] = await Promise.all([
    embed(question),
    buildLiveContext({ datasetId }),
  ]);
  const passages = await search(questionEmbedding, topK);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(question, passages, liveContext) },
  ];
  const answer = await chat(messages);

  return {
    answer,
    sources: passages.map(({ text: _text, ...meta }) => meta),
    indexed,
    liveContextUsed: Boolean(liveContext),
    reason: null,
  };
}

export { query };
