import express from 'express';
import { ApiError } from '../middleware/apiError.js';
import { z, validateQuery } from '../middleware/validate.js';
import { buildMetadata, sendDataWithMeta } from '../utils/responseMetadata.js';
import { fetchWorldNews } from '../utils/newsFeed.js';

const router = express.Router();
const newsQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform(value => Number.parseInt(String(value ?? '30'), 10))
    .refine(value => Number.isFinite(value) && value > 0 && value <= 100, 'limit must be between 1 and 100'),
});

router.get('/news', validateQuery(newsQuerySchema), async (req, res, next) => {
  const { limit } = req.query;
  const startedAt = Date.now();
  const observabilityHooks = req.app?.locals?.observability;

  try {
    const { articles: sorted, fallbackUsed } = await fetchWorldNews({ limit });
    const reliabilityScore = fallbackUsed ? 0.5 : 0.82;

    if (observabilityHooks?.recordNewsIngestion) {
      observabilityHooks.recordNewsIngestion({
        success: !fallbackUsed,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (fallbackUsed && observabilityHooks?.incidentTracker) {
      void observabilityHooks.incidentTracker.capture({
        severity: 'medium',
        category: 'news_ingestion_fallback',
        message: 'News ingestion returned no articles and fell back to degraded payload',
        requestId: req.requestId,
        traceId: req.traceId,
      });
    }

    sendDataWithMeta(
      res,
      {
        source: 'Bloomberg RSS',
        count: sorted.length,
        timestamp: new Date().toISOString(),
        articles: sorted,
      },
      buildMetadata({
        source: 'bloomberg.rss',
        sourceType: fallbackUsed ? 'fallback' : 'api',
        fallback: {
          used: fallbackUsed,
          reason: fallbackUsed ? 'all_feeds_unavailable_or_empty' : null,
        },
        freshness: {
          staleAfterSeconds: 1800,
          isStale: fallbackUsed,
        },
        reliability: {
          score: reliabilityScore,
          sourceQualityScore: 0.82,
          methodologyVersion: 'rss-world-keyword-v1',
        },
      })
    );
  } catch {
    if (observabilityHooks?.recordNewsIngestion) {
      observabilityHooks.recordNewsIngestion({
        success: false,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (observabilityHooks?.incidentTracker) {
      void observabilityHooks.incidentTracker.capture({
        severity: 'high',
        category: 'news_ingestion_failed',
        message: 'Unable to fetch Bloomberg news feed',
        requestId: req.requestId,
        traceId: req.traceId,
      });
    }

    next(new ApiError(502, 'NEWS_FETCH_FAILED', 'Unable to fetch Bloomberg news feed'));
  }
});

export default router;
