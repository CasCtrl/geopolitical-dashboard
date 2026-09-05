import sql from 'mssql';
import env from '../config/env.js';

export const ARTIFACT_BUCKETS = {
  scenarioOutputs: 'scenario_outputs',
  alertConfigs: 'alert_configs',
  customThresholds: 'custom_thresholds',
  schedulesHistory: 'schedules_history',
  advancedPrefs: 'advanced_prefs',
};

const PRIVILEGED_OWNERSHIP_ROLES = new Set(['owner', 'admin']);

export function resolveActorContext(req) {
  const principal = req.user || {};
  // In production (or when auth is required) identity MUST come from the authenticated
  // principal; client-supplied X-User-Id / X-Workspace-Id headers are ignored to prevent
  // cross-tenant access (IDOR). In development/test the header-based behavior is preserved.
  const trustPrincipalOnly = env.NODE_ENV === 'production' || env.AUTH_REQUIRED;

  const userIdHeader = req.headers['x-user-id'];
  const workspaceIdHeader = req.headers['x-workspace-id'];

  const headerUserId = typeof userIdHeader === 'string' && userIdHeader.trim()
    ? userIdHeader.trim()
    : null;
  const headerWorkspaceId = typeof workspaceIdHeader === 'string' && workspaceIdHeader.trim()
    ? workspaceIdHeader.trim()
    : null;

  const principalUserId = principal.id || principal.userId || null;
  const principalWorkspaceId = principal.workspaceId || null;

  const userId = trustPrincipalOnly
    ? (principalUserId || 'authenticated')
    : (headerUserId || 'anonymous');
  const workspaceId = trustPrincipalOnly
    ? (principalWorkspaceId || 'default')
    : (headerWorkspaceId || 'default');

  return {
    userId,
    workspaceId,
    ownerUserId: principalUserId || userId,
    ownershipRole: principal.role || 'owner',
  };
}

// Explicit ownership guard: ensure the resolved actor owns the artifact, or holds a
// privileged ownership role. Throws an ARTIFACT_FORBIDDEN error otherwise.
export function assertActorOwnsArtifact(record, context) {
  if (!record || !record.ownerUserId) {
    return;
  }

  if (record.ownerUserId === context.ownerUserId) {
    return;
  }

  if (PRIVILEGED_OWNERSHIP_ROLES.has(String(context.ownershipRole || '').toLowerCase())) {
    return;
  }

  const error = new Error('Artifact access denied');
  error.code = 'ARTIFACT_FORBIDDEN';
  throw error;
}

function parsePayload(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRecord(record) {
  return {
    artifactId: record.artifactId,
    userId: record.userId,
    workspaceId: record.workspaceId,
    ownerUserId: record.ownerUserId,
    ownershipRole: record.ownershipRole,
    artifactType: record.artifactType,
    artifactKey: record.artifactKey,
    version: record.version,
    isDeleted: Boolean(record.isDeleted),
    payload: parsePayload(record.payload),
    createdAt: record.createdAt,
    traceId: record.traceId,
  };
}

export async function getLatestArtifact(pool, { userId, workspaceId, artifactType, artifactKey }) {
  const request = pool.request();
  request.input('userId', sql.NVarChar(120), userId);
  request.input('workspaceId', sql.NVarChar(120), workspaceId);
  request.input('artifactType', sql.NVarChar(64), artifactType);
  request.input('artifactKey', sql.NVarChar(128), artifactKey);

  const result = await request.query(`
    SELECT TOP 1 *
    FROM UserWorkspaceArtifacts
    WHERE userId = @userId
      AND workspaceId = @workspaceId
      AND artifactType = @artifactType
      AND artifactKey = @artifactKey
    ORDER BY version DESC
  `);

  if (result.recordset.length === 0) {
    return null;
  }

  return mapRecord(result.recordset[0]);
}

export async function listLatestArtifacts(pool, { userId, workspaceId, artifactType, includeDeleted = false }) {
  const request = pool.request();
  request.input('userId', sql.NVarChar(120), userId);
  request.input('workspaceId', sql.NVarChar(120), workspaceId);
  request.input('artifactType', sql.NVarChar(64), artifactType);
  request.input('includeDeleted', sql.Bit, includeDeleted ? 1 : 0);

  const result = await request.query(`
    WITH ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY userId, workspaceId, artifactType, artifactKey
          ORDER BY version DESC
        ) AS rowNum
      FROM UserWorkspaceArtifacts
      WHERE userId = @userId
        AND workspaceId = @workspaceId
        AND artifactType = @artifactType
    )
    SELECT *
    FROM ranked
    WHERE rowNum = 1
      AND (@includeDeleted = 1 OR isDeleted = 0)
    ORDER BY createdAt DESC
  `);

  return result.recordset.map(mapRecord);
}

export async function putArtifactVersion(pool, {
  context,
  artifactType,
  artifactKey,
  payload,
  expectedVersion,
  traceId,
}) {
  const latest = await getLatestArtifact(pool, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    artifactType,
    artifactKey,
  });

  assertActorOwnsArtifact(latest, context);

  const currentVersion = latest?.version ?? 0;

  if (typeof expectedVersion === 'number' && expectedVersion !== currentVersion) {
    const error = new Error('Artifact version conflict');
    error.code = 'ARTIFACT_VERSION_CONFLICT';
    error.details = { expectedVersion, currentVersion };
    throw error;
  }

  const request = pool.request();
  request.input('userId', sql.NVarChar(120), context.userId);
  request.input('workspaceId', sql.NVarChar(120), context.workspaceId);
  request.input('ownerUserId', sql.NVarChar(120), latest?.ownerUserId || context.ownerUserId);
  request.input('ownershipRole', sql.NVarChar(30), latest?.ownershipRole || context.ownershipRole);
  request.input('artifactType', sql.NVarChar(64), artifactType);
  request.input('artifactKey', sql.NVarChar(128), artifactKey);
  request.input('version', sql.Int, currentVersion + 1);
  request.input('payload', sql.NVarChar(sql.MAX), JSON.stringify(payload ?? null));
  request.input('isDeleted', sql.Bit, 0);
  request.input('traceId', sql.NVarChar(120), traceId || null);

  try {
    const inserted = await request.query(`
      INSERT INTO UserWorkspaceArtifacts (
        userId,
        workspaceId,
        ownerUserId,
        ownershipRole,
        artifactType,
        artifactKey,
        version,
        isDeleted,
        payload,
        traceId
      )
      OUTPUT INSERTED.*
      VALUES (
        @userId,
        @workspaceId,
        @ownerUserId,
        @ownershipRole,
        @artifactType,
        @artifactKey,
        @version,
        @isDeleted,
        @payload,
        @traceId
      )
    `);

    return mapRecord(inserted.recordset[0]);
  } catch (err) {
    // SQL Server error 2627 = UNIQUE KEY violation from concurrent write
    // Both writes carry identical prefs — return the one that won the race
    if (err?.number === 2627 || (err?.message && err.message.includes('UNIQUE KEY'))) {
      const winner = await getLatestArtifact(pool, {
        userId: context.userId,
        workspaceId: context.workspaceId,
        artifactType,
        artifactKey,
      });
      if (winner) return winner;
    }
    throw err;
  }
}

export async function deleteArtifact(pool, {
  context,
  artifactType,
  artifactKey,
  expectedVersion,
  traceId,
}) {
  const latest = await getLatestArtifact(pool, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    artifactType,
    artifactKey,
  });

  if (!latest || latest.isDeleted) {
    return null;
  }

  assertActorOwnsArtifact(latest, context);

  if (typeof expectedVersion === 'number' && expectedVersion !== latest.version) {
    const error = new Error('Artifact version conflict');
    error.code = 'ARTIFACT_VERSION_CONFLICT';
    error.details = { expectedVersion, currentVersion: latest.version };
    throw error;
  }

  const request = pool.request();
  request.input('userId', sql.NVarChar(120), context.userId);
  request.input('workspaceId', sql.NVarChar(120), context.workspaceId);
  request.input('ownerUserId', sql.NVarChar(120), latest.ownerUserId);
  request.input('ownershipRole', sql.NVarChar(30), latest.ownershipRole);
  request.input('artifactType', sql.NVarChar(64), artifactType);
  request.input('artifactKey', sql.NVarChar(128), artifactKey);
  request.input('version', sql.Int, latest.version + 1);
  request.input('isDeleted', sql.Bit, 1);
  request.input('traceId', sql.NVarChar(120), traceId || null);

  const inserted = await request.query(`
    INSERT INTO UserWorkspaceArtifacts (
      userId,
      workspaceId,
      ownerUserId,
      ownershipRole,
      artifactType,
      artifactKey,
      version,
      isDeleted,
      payload,
      traceId
    )
    OUTPUT INSERTED.*
    VALUES (
      @userId,
      @workspaceId,
      @ownerUserId,
      @ownershipRole,
      @artifactType,
      @artifactKey,
      @version,
      @isDeleted,
      NULL,
      @traceId
    )
  `);

  return mapRecord(inserted.recordset[0]);
}
