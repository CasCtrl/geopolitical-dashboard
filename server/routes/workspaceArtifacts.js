import express from 'express';
import { getPool } from '../db/config.js';
import { ApiError } from '../middleware/apiError.js';
import { z, validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  ARTIFACT_BUCKETS,
  resolveActorContext,
  getLatestArtifact,
  listLatestArtifacts,
  putArtifactVersion,
  deleteArtifact,
} from '../utils/workspaceArtifactsStore.js';

const router = express.Router();

const bucketKeys = Object.keys(ARTIFACT_BUCKETS);

const bucketParamsSchema = z.object({
  bucket: z.enum(bucketKeys),
  artifactKey: z.string().min(1).max(128).optional(),
});

const versionedPayloadSchema = z.object({
  payload: z.unknown(),
  expectedVersion: z.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  includeDeleted: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return false;
      if (typeof value === 'boolean') return value;
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }),
});

function artifactTypeFromBucket(bucket) {
  return ARTIFACT_BUCKETS[bucket];
}

function normalizeVersionConflict(error, next) {
  if (error?.code === 'ARTIFACT_VERSION_CONFLICT') {
    return next(new ApiError(409, 'ARTIFACT_VERSION_CONFLICT', 'Artifact version mismatch', error.details));
  }

  return next(error);
}

router.get('/workspace/state/:bucket', validateParams(bucketParamsSchema), validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
    }

    const context = resolveActorContext(req);
    const artifactType = artifactTypeFromBucket(req.params.bucket);

    const artifacts = await listLatestArtifacts(pool, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      artifactType,
      includeDeleted: req.query.includeDeleted,
    });

    res.json({
      bucket: req.params.bucket,
      artifactType,
      userId: context.userId,
      workspaceId: context.workspaceId,
      artifacts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/workspace/state/:bucket/:artifactKey', validateParams(bucketParamsSchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
    }

    const context = resolveActorContext(req);
    const artifactType = artifactTypeFromBucket(req.params.bucket);

    const latest = await getLatestArtifact(pool, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      artifactType,
      artifactKey: req.params.artifactKey,
    });

    if (!latest || latest.isDeleted) {
      throw new ApiError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
    }

    res.json({
      bucket: req.params.bucket,
      artifactType,
      artifact: latest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/workspace/state/:bucket/:artifactKey', validateParams(bucketParamsSchema), validateBody(versionedPayloadSchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
    }

    const context = resolveActorContext(req);
    const artifactType = artifactTypeFromBucket(req.params.bucket);

    const updated = await putArtifactVersion(pool, {
      context,
      artifactType,
      artifactKey: req.params.artifactKey,
      payload: req.body.payload,
      expectedVersion: req.body.expectedVersion,
      traceId: req.traceId,
    });

    res.status(201).json({
      bucket: req.params.bucket,
      artifactType,
      artifact: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    normalizeVersionConflict(error, next);
  }
});

router.delete('/workspace/state/:bucket/:artifactKey', validateParams(bucketParamsSchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
    }

    const context = resolveActorContext(req);
    const artifactType = artifactTypeFromBucket(req.params.bucket);

    const deleted = await deleteArtifact(pool, {
      context,
      artifactType,
      artifactKey: req.params.artifactKey,
      traceId: req.traceId,
    });

    if (!deleted) {
      throw new ApiError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
    }

    res.json({
      bucket: req.params.bucket,
      artifactType,
      artifact: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    normalizeVersionConflict(error, next);
  }
});

export default router;
