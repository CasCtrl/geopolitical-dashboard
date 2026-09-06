const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

// ragStore.js is ESM; the jest config runs CommonJS without --experimental-vm-modules,
// so we exercise the REAL module in a spawned Node ESM process and assert on its JSON output.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const STORE_URL = pathToFileURL(path.join(PROJECT_ROOT, 'server', 'utils', 'ragStore.js')).href;

function runInNode(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module'], {
      cwd: PROJECT_ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += String(c); });
    child.stderr.on('data', (c) => { stderr += String(c); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`node exited ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim().split('\n').pop()));
      } catch (e) {
        reject(new Error(`Could not parse output: ${stdout}\n${stderr}\n${e.message}`));
      }
    });
    child.stdin.write(script);
    child.stdin.end();
  });
}

describe('ragStore cosine-similarity search (real module)', () => {
  let storePath;
  let result;

  beforeAll(async () => {
    storePath = path.join(os.tmpdir(), `rag-store-unit-${Date.now()}.json`);
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DB_INIT_ENABLED: 'false',
      DB_CONNECT_STRICT: 'false',
      AUTH_REQUIRED: 'false',
      RAG_STORE_PATH: storePath,
    };

    const script = `
      const { replaceAll, search, count } = await import(${JSON.stringify(STORE_URL)});
      await replaceAll([
        { id: 'A', text: 'aligned', source: 'docA', embedding: [0.1, 0.2, 0.3, 0.4], metadata: {} },
        { id: 'B', text: 'reversed', source: 'docB', embedding: [0.4, 0.3, 0.2, 0.1], metadata: {} },
        { id: 'C', text: 'mismatch', source: 'docC', embedding: [1, 1], metadata: {} },
      ]);
      const total = await count();
      const top3 = await search([0.1, 0.2, 0.3, 0.4], 3);
      const top1 = await search([0.1, 0.2, 0.3, 0.4], 1);
      console.log(JSON.stringify({ total, top3, top1 }));
    `;
    result = await runInNode(script, env);
  });

  afterAll(async () => {
    await fs.rm(storePath, { force: true });
  });

  test('persists and reports the seeded record count', () => {
    expect(result.total).toBe(3);
  });

  test('ranks the most similar record first with descending scores', () => {
    expect(result.top3.map((r) => r.id)).toEqual(['A', 'B', 'C']);
    expect(result.top3[0].score).toBeCloseTo(1, 5);
    expect(result.top3[0].score).toBeGreaterThan(result.top3[1].score);
    expect(result.top3[1].score).toBeGreaterThan(result.top3[2].score);
  });

  test('scores a dimension-mismatched embedding as 0', () => {
    const mismatch = result.top3.find((r) => r.id === 'C');
    expect(mismatch.score).toBe(0);
  });

  test('respects the topK limit', () => {
    expect(result.top1).toHaveLength(1);
    expect(result.top1[0].id).toBe('A');
  });

  test('search results expose id/source/score/metadata', () => {
    const first = result.top3[0];
    expect(first).toHaveProperty('source', 'docA');
    expect(first).toHaveProperty('score');
    expect(first).toHaveProperty('metadata');
  });
});
