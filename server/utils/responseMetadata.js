const SOURCE_QUALITY_BY_TYPE = {
  database: 0.95,
  api: 0.85,
  generated: 0.8,
  fallback: 0.45,
};

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function qualityTier(score) {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'medium';
  return 'low';
}

function buildMetadata({
  source,
  sourceType,
  fallback = { used: false },
  freshness = {},
  reliability = {},
}) {
  const now = new Date().toISOString();
  const baseScore = SOURCE_QUALITY_BY_TYPE[sourceType] ?? 0.7;
  const score = clampScore(reliability.score ?? baseScore);

  return {
    freshness: {
      generatedAt: freshness.generatedAt ?? now,
      lastSuccessfulRefreshAt: freshness.lastSuccessfulRefreshAt ?? now,
      staleAfterSeconds: freshness.staleAfterSeconds ?? 86400,
      isStale: Boolean(freshness.isStale),
    },
    reliability: {
      score,
      tier: qualityTier(score),
      sourceQualityScore: clampScore(reliability.sourceQualityScore ?? baseScore),
      methodologyVersion: reliability.methodologyVersion ?? 'v1',
    },
    provenance: {
      source,
      sourceType,
      fallback: {
        used: Boolean(fallback.used),
        reason: fallback.reason ?? null,
      },
    },
  };
}

function sendDataWithMeta(res, data, metadata, statusCode = 200) {
  res.status(statusCode).json({
    data,
    meta: metadata,
  });
}

export {
  buildMetadata,
  sendDataWithMeta,
};