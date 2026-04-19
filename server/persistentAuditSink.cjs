const { appendFile, mkdir, readdir, unlink } = require('fs/promises');
const path = require('path');

const DEFAULT_AUDIT_SINK_MAX_FILES = 14;

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function buildAuditFilePath(directory, date = new Date()) {
  return path.join(directory, `audit-${toIsoDate(date)}.jsonl`);
}

async function pruneAuditFiles(directory, maxFiles) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && /^audit-\d{4}-\d{2}-\d{2}\.jsonl$/.test(entry.name))
    .map(entry => entry.name)
    .sort();

  if (files.length <= maxFiles) {
    return;
  }

  const toDelete = files.slice(0, files.length - maxFiles);
  await Promise.all(toDelete.map(file => unlink(path.join(directory, file))));
}

function createPersistentAuditSink({
  enabled = false,
  directory,
  maxFiles = DEFAULT_AUDIT_SINK_MAX_FILES,
  now = () => new Date(),
  logger = () => {},
} = {}) {
  const normalizedMaxFiles = Number.isFinite(maxFiles) && maxFiles > 0
    ? Math.floor(maxFiles)
    : DEFAULT_AUDIT_SINK_MAX_FILES;

  let initialized = false;

  async function ensureDirectoryReady() {
    if (initialized || !enabled) {
      return;
    }

    await mkdir(directory, { recursive: true });
    initialized = true;
  }

  async function write(entry) {
    if (!enabled) {
      return;
    }

    try {
      await ensureDirectoryReady();
      const filePath = buildAuditFilePath(directory, now());
      await appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
      await pruneAuditFiles(directory, normalizedMaxFiles);
    } catch (error) {
      logger({
        message: 'audit.sink.write_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    write,
  };
}

module.exports = {
  DEFAULT_AUDIT_SINK_MAX_FILES,
  buildAuditFilePath,
  createPersistentAuditSink,
  pruneAuditFiles,
};
