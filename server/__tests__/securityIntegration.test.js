const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

jest.setTimeout(45000);

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
      // Keep polling until timeout.
    }

    await delay(200);
  }

  throw new Error(`Timed out waiting for test server health check. Output: ${getOutput()}`);
}

function startServer(extraEnv = {}) {
  const port = String(5800 + Math.floor(Math.random() * 200));
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    SERVER_PORT: port,
    DB_CONNECT_STRICT: 'false',
    DB_INIT_ENABLED: 'false',
    AUTH_REQUIRED: 'false',
    RATE_LIMIT_MAX: '500',
    EXPENSIVE_WRITE_WINDOW_MS: '60000',
    EXPENSIVE_WRITE_MAX: '2',
    ADMIN_RATE_LIMIT_WINDOW_MS: '60000',
    ADMIN_RATE_LIMIT_MAX: '2',
    AUDIT_SINK_ENABLED: 'false',
    ...extraEnv,
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

  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
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

describe('security integration smoke tests', () => {
  let server;

  beforeAll(async () => {
    server = startServer({
      EXPENSIVE_WRITE_MAX: '25',
      ADMIN_RATE_LIMIT_MAX: '25',
    });
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    await stopServer(server.serverProcess);
  });

  test('exposes strict security headers on /api/health', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  test('applies security headers to admin endpoints', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/admin/audit-trail', {
      headers: { 'x-user-role': 'admin' },
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });
});

describe('abuse protection endpoint limits', () => {
  let server;

  beforeAll(async () => {
    server = startServer();
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    await stopServer(server.serverProcess);
  });

  test('returns 429 for expensive report generation endpoint after threshold', async () => {
    const payload = {
      format: 'pdf',
      title: 'Security Hardening Test Report',
    };

    for (let i = 0; i < 2; i += 1) {
      const response = await makeRequest(server.baseUrl, 'POST', '/api/reports/generate', {
        body: payload,
      });

      expect(response.status).toBe(200);
    }

    const limited = await makeRequest(server.baseUrl, 'POST', '/api/reports/generate', {
      body: payload,
    });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('ABUSE_PROTECTION_TRIGGERED');
  });

  test('returns 429 for admin endpoint after threshold', async () => {
    for (let i = 0; i < 2; i += 1) {
      const response = await makeRequest(server.baseUrl, 'GET', '/api/admin/audit-trail', {
        headers: { 'x-user-role': 'admin' },
      });

      expect(response.status).toBe(200);
    }

    const limited = await makeRequest(server.baseUrl, 'GET', '/api/admin/audit-trail', {
      headers: { 'x-user-role': 'admin' },
    });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('ADMIN_RATE_LIMITED');
  });
});
