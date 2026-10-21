import 'dotenv/config';
import mysql from 'mysql2/promise';

let poolInstance = null;

/**
 * Resolves database configuration with strict TLS/SSL enforcement for TiDB Cloud
 * and cloud providers, while preserving unencrypted local development.
 */
export function getPoolConfig() {
  const isServerless = process.env.VERCEL === '1';
  const defaultConnectionLimit = isServerless ? 3 : 10;
  const connectionLimit = parseInt(
    process.env.MYSQL_CONNECTION_LIMIT || String(defaultConnectionLimit),
    10
  );
  const connectTimeout = parseInt(
    process.env.MYSQL_CONNECT_TIMEOUT || '10000',
    10
  );

  // 1. Host and Port Resolution
  const rawHost = (process.env.MYSQL_HOST || '127.0.0.1').trim().replace(/^['"]|['"]$/g, '');
  const isLocal =
    rawHost === '127.0.0.1' ||
    rawHost.toLowerCase() === 'localhost';

  const isTiDB =
    rawHost.toLowerCase().includes('tidbcloud') ||
    rawHost.toLowerCase().includes('pingcap') ||
    Boolean(process.env.TIDB_HOST);

  const defaultPort = isTiDB ? 4000 : 3306;
  const port = parseInt(process.env.MYSQL_PORT || String(defaultPort), 10);

  // 2. Strict TLS / SSL Determination
  // TiDB Cloud Serverless strictly mandates TLS encrypted transport.
  // SSL is enabled if:
  // - MYSQL_SSL is explicitly enabled ('true', '1', 'yes', 'on')
  // - Or host is TiDB Cloud (contains 'tidbcloud' or 'pingcap')
  // - Or port is 4000
  // - Or host is a remote cloud server (not 127.0.0.1 / localhost) AND not explicitly disabled
  const sslRaw = (process.env.MYSQL_SSL || '').trim().toLowerCase();
  const isSslExplicitlyDisabled =
    sslRaw === 'false' || sslRaw === '0' || sslRaw === 'off' || sslRaw === 'no';
  const isSslExplicitlyEnabled =
    sslRaw === 'true' || sslRaw === '1' || sslRaw === 'yes' || sslRaw === 'on';

  const shouldEnableSsl =
    isSslExplicitlyEnabled ||
    (!isSslExplicitlyDisabled && (isTiDB || port === 4000 || !isLocal));

  // Build SSL options: Strict certificate validation against trusted root CAs
  const sslConfig = shouldEnableSsl
    ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      }
    : undefined;

  const user = (process.env.MYSQL_USER || (isLocal ? 'root' : 'finance360_app'))
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const database = (process.env.MYSQL_DATABASE || 'finance_data')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const password = (process.env.MYSQL_PASSWORD || '').replace(/^['"]|['"]$/g, '');

  const config = {
    host: rawHost,
    port: port,
    database: database,
    user: user,
    password: password,
    waitForConnections: true,
    connectionLimit: connectionLimit,
    maxIdle: connectionLimit,
    idleTimeout: 60000,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true,
    connectTimeout: connectTimeout,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  if (sslConfig) {
    config.ssl = sslConfig;
  }

  return config;
}

/**
 * Returns the active connection pool singleton, initializing lazily on first access.
 */
export function getPool() {
  if (!poolInstance) {
    const config = getPoolConfig();
    console.log(
      `[MySQL Client] Initialized connection pool: host=${config.host}, port=${config.port}, database=${config.database}, ssl=${Boolean(config.ssl)}, poolLimit=${config.connectionLimit}`
    );
    poolInstance = mysql.createPool(config);
  }
  return poolInstance;
}

export const mysqlService = {
  /**
   * Executes a parameterized query using the connection pool.
   * Returns rows array.
   */
  async executeQuery(query, params = []) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (err) {
      console.error('[MySQL Error]', err.message);
      throw err;
    }
  },

  /**
   * Health check to verify MySQL connectivity.
   */
  async testConnection() {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT 1 AS status');
      return rows && rows.length > 0;
    } catch (err) {
      console.error('[MySQL Health Check Failed]', err.message);
      return false;
    }
  },

  /**
   * Graceful pool close.
   */
  async close() {
    if (poolInstance) {
      await poolInstance.end();
      poolInstance = null;
    }
  },
};

export default mysqlService;
