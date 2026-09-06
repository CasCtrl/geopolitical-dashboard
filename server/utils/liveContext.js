import sql from 'mssql';
import { getPool } from '../db/config.js';

// Builds a compact, human-readable snapshot of live portfolio state from the DB so the
// RAG answer can reflect current holdings, not just indexed documents.
// Returns an empty string when the DB is unavailable or no dataset is specified — callers
// treat live context as optional enrichment, never a hard dependency.
async function buildLiveContext({ datasetId } = {}) {
  if (!datasetId) {
    return '';
  }

  let pool;
  try {
    pool = await getPool();
  } catch {
    return '';
  }
  if (!pool) {
    return '';
  }

  try {
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), datasetId);
    const result = await request.query(`
      SELECT TOP 10 a.ticker, a.assetName, a.weight, a.sector
      FROM Assets a
      WHERE a.datasetId = @datasetId
      ORDER BY a.weight DESC
    `);

    const rows = result.recordset ?? [];
    if (rows.length === 0) {
      return '';
    }

    const lines = rows.map(
      row => `- ${row.ticker} (${row.assetName ?? 'n/a'}), sector: ${row.sector ?? 'n/a'}, weight: ${row.weight ?? 'n/a'}`
    );
    return `Current portfolio holdings for dataset "${datasetId}" (top ${rows.length} by weight):\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

export { buildLiveContext };
