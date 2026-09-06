import express from 'express';
import { ApiError } from '../middleware/apiError.js';
import { z, validateBody } from '../middleware/validate.js';
import { buildMetadata, sendDataWithMeta } from '../utils/responseMetadata.js';
import { query } from '../utils/ragPipeline.js';
import { count } from '../utils/ragStore.js';
import { isReachable } from '../utils/ollamaClient.js';

const router = express.Router();

const querySchema = z.object({
  question: z.string().trim().min(3).max(1000),
  topK: z.coerce.number().int().min(1).max(10).optional().default(4),
  datasetId: z.string().trim().min(1).max(50).optional(),
});

router.post('/query', validateBody(querySchema), async (req, res) => {
  const { question, topK, datasetId } = req.body;
  try {
    const result = await query(question, { topK, datasetId });

    if (result.reason === 'empty_index') {
      return sendDataWithMeta(
        res,
        { answer: null, sources: [], indexed: 0 },
        buildMetadata({
          source: 'rag.local',
          sourceType: 'fallback',
          fallback: { used: true, reason: 'index_empty' },
          reliability: { score: 0.3, methodologyVersion: 'rag-local-v1' },
          freshness: { isStale: true },
        })
      );
    }

    return sendDataWithMeta(
      res,
      {
        answer: result.answer,
        sources: result.sources,
        indexed: result.indexed,
        liveContextUsed: Boolean(result.liveContextUsed),
      },
      buildMetadata({
        source: 'rag.local',
        sourceType: 'generated',
        reliability: {
          score: result.sources.length ? 0.75 : 0.5,
          sourceQualityScore: 0.8,
          methodologyVersion: 'rag-local-v1',
        },
        freshness: { staleAfterSeconds: 3600 },
      })
    );
  } catch {
    // Backend (Ollama) unreachable or failed — degrade gracefully rather than leaking errors.
    return sendDataWithMeta(
      res,
      { answer: null, sources: [], indexed: null },
      buildMetadata({
        source: 'rag.local',
        sourceType: 'fallback',
        fallback: { used: true, reason: 'llm_backend_unavailable' },
        reliability: { score: 0.3, methodologyVersion: 'rag-local-v1' },
        freshness: { isStale: true },
      })
    );
  }
});

router.get('/status', async (_req, res, next) => {
  try {
    const [indexed, backendReachable] = await Promise.all([count(), isReachable()]);
    return sendDataWithMeta(
      res,
      { indexed, backendReachable, ready: indexed > 0 && backendReachable },
      buildMetadata({
        source: 'rag.local',
        sourceType: 'generated',
        reliability: { methodologyVersion: 'rag-local-v1' },
        freshness: { staleAfterSeconds: 60 },
      })
    );
  } catch {
    next(new ApiError(500, 'RAG_STATUS_FAILED', 'Failed to read RAG status'));
  }
});

export default router;
