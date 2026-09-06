const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const fs = require('fs/promises');

jest.setTimeout(45000);

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(baseUrl, method, routePath, { headers = {}, body } = {}) {
  const url = new URL(routePath, baseUrl);
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers: payload
          ? {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(payload),
              ...headers,
            }
          : headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          let parsedBody = null;
          try {
            parsedBody = rawBody ? JSON.parse(rawBody) : null;
          } catch {
            parsedBody = rawBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function waitForHealth(baseUrl, getOutput, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await makeRequest(baseUrl, 'GET', '/health');
      if (response.status === 200) {
        return;
      }
    } catch {
      // keep polling
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for test server health check. Output: ${getOutput()}`);
}

function startServer({ storePath } = {}) {
  const port = String(5800 + Math.floor(Math.random() * 200));
  // Point RAG at the given store (empty by default) and an unreachable Ollama so fallback paths are exercised.
  const resolvedStorePath = storePath || path.join(os.tmpdir(), `rag-index-${Date.now()}-${port}.json`);
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    SERVER_PORT: port,
    DB_CONNECT_STRICT: 'false',
    DB_INIT_ENABLED: 'false',
    AUTH_REQUIRED: 'false',
    AUDIT_SINK_ENABLED: 'false',
    OLLAMA_BASE_URL: 'http://127.0.0.1:1',
    RAG_STORE_PATH: resolvedStorePath,
    RAG_TIMEOUT_MS: '1500',
  };

  const serverProcess = spawn(process.execPath, ['server/server.js'], {
    cwd: PROJECT_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  serverProcess.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  serverProcess.stderr.on('data', (chunk) => {
    output += String(chunk);
  });

  return { baseUrl: `http://127.0.0.1:${port}`, serverProcess, getOutput: () => output };
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) {
    return;
  }
  serverProcess.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      serverProcess.kill('SIGKILL');
      resolve();
    }, 5000);
    serverProcess.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('local RAG route', () => {
  let server;

  beforeAll(async () => {
    server = startServer();
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    await stopServer(server.serverProcess);
  });

  test('status endpoint reports empty index and unreachable backend in envelope', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/rag/status');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta.provenance.sourceType');
    expect(response.body.data.indexed).toBe(0);
    expect(response.body.data.backendReachable).toBe(false);
    expect(response.body.data.ready).toBe(false);
  });

  test('query with empty index returns graceful fallback envelope', async () => {
    const response = await makeRequest(server.baseUrl, 'POST', '/api/rag/query', {
      body: { question: 'How is Value-at-Risk computed?' },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.answer).toBeNull();
    expect(Array.isArray(response.body.data.sources)).toBe(true);
    expect(response.body.meta.provenance.fallback.used).toBe(true);
    expect(response.body.meta.provenance.sourceType).toBe('fallback');
  });

  test('rejects invalid query payload with validation error', async () => {
    const response = await makeRequest(server.baseUrl, 'POST', '/api/rag/query', {
      body: { question: 'a' },
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('accepts an optional datasetId and still returns a graceful envelope', async () => {
    const response = await makeRequest(server.baseUrl, 'POST', '/api/rag/query', {
      body: { question: 'How exposed is my portfolio to energy risk?', datasetId: 'short-25' },
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta.provenance.fallback.used', true);
  });

  test('rejects a datasetId that exceeds the allowed length', async () => {
    const response = await makeRequest(server.baseUrl, 'POST', '/api/rag/query', {
      body: { question: 'Valid question here', datasetId: 'x'.repeat(51) },
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('local RAG route with a seeded (non-empty) index but unreachable backend', () => {
  let server;
  let storePath;

  beforeAll(async () => {
    // Seed a small index on disk BEFORE the server starts so the store loads it.
    storePath = path.join(os.tmpdir(), `rag-seeded-${Date.now()}.json`);
    const records = [
      {
        id: 'RISK_ALGORITHMS.md#0',
        text: 'Value-at-Risk is computed via Monte Carlo simulation over correlated returns.',
        source: 'RISK_ALGORITHMS.md',
        embedding: [0.1, 0.2, 0.3, 0.4],
        metadata: { chunkIndex: 0 },
      },
      {
        id: 'news:bloomberg-1',
        text: 'Energy sector faces new sanctions affecting oil exports.',
        source: 'news:Bloomberg',
        embedding: [0.4, 0.3, 0.2, 0.1],
        metadata: { url: 'https://example.com/a', title: 'Energy sanctions' },
      },
    ];
    await fs.writeFile(
      storePath,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), records }),
      'utf8'
    );

    server = startServer({ storePath });
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    await stopServer(server.serverProcess);
    await fs.rm(storePath, { force: true });
  });

  test('status reports a non-empty index that is not ready while backend is down', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/rag/status');

    expect(response.status).toBe(200);
    expect(response.body.data.indexed).toBe(2);
    expect(response.body.data.backendReachable).toBe(false);
    expect(response.body.data.ready).toBe(false);
  });

  test('query degrades to a 200 fallback (never 5xx) when the LLM backend is unreachable', async () => {
    const response = await makeRequest(server.baseUrl, 'POST', '/api/rag/query', {
      body: { question: 'How is Value-at-Risk computed?' },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.answer).toBeNull();
    expect(response.body.meta.provenance.fallback.used).toBe(true);
    expect(response.body.meta.provenance.fallback.reason).toBe('llm_backend_unavailable');
    // No raw error text should leak into the response.
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|stack|Error:/i);
  });
});
