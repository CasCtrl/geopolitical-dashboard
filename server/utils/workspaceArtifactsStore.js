import sql from 'mssql';

export const ARTIFACT_BUCKETS = {
  scenarioOutputs: 'scenario_outputs',
  alertConfigs: 'alert_configs',
  customThresholds: 'custom_thresholds',
  schedulesHistory: 'schedules_history',
  advancedPrefs: 'advanced_prefs',
};

export function resolveActorContext(req) {
  const userIdHeader = req.headers['x-user-id'];
  const workspaceIdHeader = req.headers['x-workspace-id'];

  const userId = typeof userIdHeader === 'string' && userIdHeader.trim()
    ? userIdHeader.trim()
    : 'anonymous';
  const workspaceId = typeof workspaceIdHeader === 'string' && workspaceIdHeader.trim()
    ? workspaceIdHeader.trim()
    : 'default';

  return {
    userId,
    workspaceId,
    ownerUserId: req.user?.id || userId,
    ownershipRole: req.user?.role || 'owner',
  };
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
