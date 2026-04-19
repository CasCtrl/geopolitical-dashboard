const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

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

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
          });
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

function startServer() {
  const port = String(5600 + Math.floor(Math.random() * 200));
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    SERVER_PORT: port,
    DB_CONNECT_STRICT: 'false',
    DB_INIT_ENABLED: 'false',
    AUTH_REQUIRED: 'false',
    AUDIT_SINK_ENABLED: 'false',
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

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    serverProcess,
    getOutput: () => output,
  };
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

describe('API contract with metadata envelope', () => {
  let server;

  beforeAll(async () => {
    server = startServer();
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    await stopServer(server.serverProcess);
  });

  test('serves OpenAPI contract endpoint', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/openapi.yaml');

    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toContain('/api/datasets');
    expect(response.body).toContain('/api/news');
  });

  test('returns datasets in envelope with freshness/reliability/provenance metadata', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/datasets');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toHaveProperty('freshness.generatedAt');
    expect(response.body.meta).toHaveProperty('reliability.score');
    expect(response.body.meta).toHaveProperty('provenance.sourceType');
    expect(typeof response.body.meta.provenance.fallback.used).toBe('boolean');
  });

  test('returns news payload in envelope with transparent fallback and source-quality scoring', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/news?limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data.articles');
    expect(response.body).toHaveProperty('meta.provenance.fallback.used');
    expect(response.body).toHaveProperty('meta.reliability.sourceQualityScore');
    expect(Array.isArray(response.body.data.articles)).toBe(true);
    expect(response.body.meta.reliability.score).toBeGreaterThanOrEqual(0);
    expect(response.body.meta.reliability.score).toBeLessThanOrEqual(1);
  });

  test('returns reports templates in envelope', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/reports/templates');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data.success', true);
    expect(Array.isArray(response.body.data.templates)).toBe(true);
    expect(response.body).toHaveProperty('meta.reliability.methodologyVersion');
  });

  test('accepts frontend crash telemetry and exposes incidents dashboard endpoint', async () => {
    const telemetryResponse = await makeRequest(server.baseUrl, 'POST', '/api/telemetry/frontend-crash', {
      body: {
        message: 'UI crashed while rendering map',
        route: '/dashboard',
        release: '1.1.0-test',
      },
    });

    expect(telemetryResponse.status).toBe(202);
    expect(telemetryResponse.body).toHaveProperty('accepted', true);
    expect(telemetryResponse.body).toHaveProperty('traceId');

    const incidentsResponse = await makeRequest(server.baseUrl, 'GET', '/api/admin/incidents', {
      headers: { 'x-user-role': 'admin' },
    });

    expect(incidentsResponse.status).toBe(200);
    expect(Array.isArray(incidentsResponse.body.incidents)).toBe(true);
    expect(incidentsResponse.body).toHaveProperty('summary.total');
  });

  test('returns alert payload with SLO dashboard fields', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/admin/alerts', {
      headers: { 'x-user-role': 'admin' },
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('slo.objectives');
    expect(response.body).toHaveProperty('slo.indicators');
    expect(response.body).toHaveProperty('slo.status');
  });
});
