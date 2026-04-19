const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const sql = require('mssql');

jest.setTimeout(70000);

const RUN_DB_TESTS = process.env.DB_INTEGRATION_TESTS === 'true';
const describeIfDb = RUN_DB_TESTS ? describe : describe.skip;
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

          resolve({ status: res.statusCode, body: parsedBody });
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

async function waitForHealth(baseUrl, getOutput, timeoutMs = 25000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await makeRequest(baseUrl, 'GET', '/ready');
      if (response.status === 200) {
        return;
      }
    } catch {
      // keep polling
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for test server readiness. Output: ${getOutput()}`);
}

function startServer() {
  const port = String(5900 + Math.floor(Math.random() * 100));
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    SERVER_PORT: port,
    DB_CONNECT_STRICT: 'true',
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
    }, 6000);

    serverProcess.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitForDbConnection(config, timeoutMs = 45000) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    let pool;
    try {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      await pool.close();
      return;
    } catch (err) {
      lastError = err;
      if (pool) {
        try {
          await pool.close();
        } catch {
          // ignore
        }
      }
      await delay(1000);
    }
  }

  throw new Error(`Unable to connect to MSSQL for integration tests: ${lastError?.message || 'unknown error'}`);
}

describeIfDb('DB-backed backend route integration', () => {
  let pool;
  let server;
  const testDatasetId = `integration_${Date.now()}`;

  const dbConfig = {
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_DATABASE || 'geopolitical_dashboard',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword123!',
    port: Number(process.env.DB_PORT || 1433),
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  };

  beforeAll(async () => {
    await waitForDbConnection(dbConfig);

    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Datasets]') AND type in (N'U'))
      CREATE TABLE Datasets (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL UNIQUE,
        datasetName NVARCHAR(255) NOT NULL,
        datasetDescription NVARCHAR(500)
      )
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Assets]') AND type in (N'U'))
      CREATE TABLE Assets (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL,
        ticker NVARCHAR(50) NOT NULL,
        assetName NVARCHAR(255) NOT NULL,
        weight FLOAT NOT NULL,
        value FLOAT NOT NULL,
        sector NVARCHAR(100),
        FOREIGN KEY (datasetId) REFERENCES Datasets(datasetId),
        UNIQUE(datasetId, ticker)
      )
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Countries]') AND type in (N'U'))
      CREATE TABLE Countries (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL UNIQUE,
        baseRiskScore FLOAT DEFAULT 0
      )
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CountryDependencies]') AND type in (N'U'))
      CREATE TABLE CountryDependencies (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL,
        ticker NVARCHAR(50) NOT NULL,
        country NVARCHAR(100) NOT NULL,
        dependencyWeight FLOAT NOT NULL,
        dependencyType NVARCHAR(50) NOT NULL,
        dependencyReason NVARCHAR(500),
        FOREIGN KEY (datasetId, ticker) REFERENCES Assets(datasetId, ticker),
        FOREIGN KEY (country) REFERENCES Countries(name)
      )
    `);

    await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM Countries WHERE name = 'Japan') INSERT INTO Countries (name, baseRiskScore) VALUES ('Japan', 47)`);
    await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM Countries WHERE name = 'Germany') INSERT INTO Countries (name, baseRiskScore) VALUES ('Germany', 39)`);

    await pool
      .request()
      .input('datasetId', sql.NVarChar(50), testDatasetId)
      .query(`INSERT INTO Datasets (datasetId, datasetName, datasetDescription) VALUES (@datasetId, 'Integration Dataset', 'DB route integration test dataset')`);

    await pool
      .request()
      .input('datasetId', sql.NVarChar(50), testDatasetId)
      .query(`
        INSERT INTO Assets (datasetId, ticker, assetName, weight, value, sector)
        VALUES
          (@datasetId, 'INTG1', 'Integration Asset 1', 12.5, 125000, 'Technology'),
          (@datasetId, 'INTG2', 'Integration Asset 2', 8.2, 82000, 'Industrials')
      `);

    await pool
      .request()
      .input('datasetId', sql.NVarChar(50), testDatasetId)
      .query(`
        INSERT INTO CountryDependencies (datasetId, ticker, country, dependencyWeight, dependencyType, dependencyReason)
        VALUES
          (@datasetId, 'INTG1', 'Japan', 0.7, 'direct', 'Manufacturing concentration'),
          (@datasetId, 'INTG1', 'Germany', 0.3, 'indirect', 'Supplier channel'),
          (@datasetId, 'INTG2', 'Germany', 1.0, 'direct', 'Core production')
      `);

    server = startServer();
    await waitForHealth(server.baseUrl, server.getOutput);
  });

  afterAll(async () => {
    if (pool?.connected) {
      await pool
        .request()
        .input('datasetId', sql.NVarChar(50), testDatasetId)
        .query('DELETE FROM CountryDependencies WHERE datasetId = @datasetId');
      await pool
        .request()
        .input('datasetId', sql.NVarChar(50), testDatasetId)
        .query('DELETE FROM Assets WHERE datasetId = @datasetId');
      await pool
        .request()
        .input('datasetId', sql.NVarChar(50), testDatasetId)
        .query('DELETE FROM Datasets WHERE datasetId = @datasetId');

      await pool.close();
    }

    await stopServer(server?.serverProcess);
  });

  test('returns datasets from live DB connection', async () => {
    const response = await makeRequest(server.baseUrl, 'GET', '/api/datasets');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);

    const found = response.body.data.find((dataset) => dataset.datasetId === testDatasetId);
    expect(found).toBeTruthy();
    expect(response.body.meta.provenance.sourceType).toBe('database');
    expect(response.body.meta.provenance.fallback.used).toBe(false);
  });

  test('returns DB-backed assets and dependencies for integration dataset', async () => {
    const [assetsResponse, depsResponse] = await Promise.all([
      makeRequest(server.baseUrl, 'GET', `/api/assets/${testDatasetId}`),
      makeRequest(server.baseUrl, 'GET', `/api/dependencies/${testDatasetId}`),
    ]);

    expect(assetsResponse.status).toBe(200);
    expect(depsResponse.status).toBe(200);

    const tickers = assetsResponse.body.data.map((asset) => asset.ticker);
    expect(tickers).toEqual(expect.arrayContaining(['INTG1', 'INTG2']));

    const dependencyCountries = depsResponse.body.data.map((dep) => dep.country);
    expect(dependencyCountries).toEqual(expect.arrayContaining(['Japan', 'Germany']));

    expect(assetsResponse.body.meta.provenance.sourceType).toBe('database');
    expect(depsResponse.body.meta.provenance.sourceType).toBe('database');
  });
});
