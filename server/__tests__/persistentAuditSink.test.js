const { mkdtemp, readdir, readFile } = require('fs/promises');
const { tmpdir } = require('os');
const path = require('path');

const {
  buildAuditFilePath,
  createPersistentAuditSink,
} = require('../persistentAuditSink.cjs');

describe('persistentAuditSink', () => {
  test('writes JSONL entries to date-based file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audit-sink-'));
    const sink = createPersistentAuditSink({
      enabled: true,
      directory: dir,
      maxFiles: 5,
      now: () => new Date('2026-04-19T12:00:00.000Z'),
    });

    await sink.write({ id: '1', action: 'admin.metrics.read' });

    const filePath = buildAuditFilePath(dir, new Date('2026-04-19T00:00:00.000Z'));
    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({ id: '1', action: 'admin.metrics.read' });
  });

  test('prunes older daily files beyond retention', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audit-sink-'));
    const dates = [
      new Date('2026-04-17T00:00:00.000Z'),
      new Date('2026-04-18T00:00:00.000Z'),
      new Date('2026-04-19T00:00:00.000Z'),
    ];
    let index = 0;

    const sink = createPersistentAuditSink({
      enabled: true,
      directory: dir,
      maxFiles: 2,
      now: () => dates[Math.min(index++, dates.length - 1)],
    });

    await sink.write({ id: 'a' });
    await sink.write({ id: 'b' });
    await sink.write({ id: 'c' });

    const files = (await readdir(dir)).filter((name) => name.endsWith('.jsonl')).sort();

    expect(files).toEqual(['audit-2026-04-18.jsonl', 'audit-2026-04-19.jsonl']);
  });
});
