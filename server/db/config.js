import sql from 'mssql';
import env from '../config/env.js';

const config = {
  server: env.DB_SERVER,
  database: env.DB_DATABASE,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      console.log('✓ Connected to SQL Server');
    } catch (err) {
      pool = null;
      if (env.DB_CONNECT_STRICT) {
        throw err;
      }

      console.warn('⚠ SQL Server connection failed (continuing in degraded mode):', err.message);
      return null;
    }
  }
  return pool;
}

export { getPool, config };
