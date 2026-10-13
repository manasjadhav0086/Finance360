import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'finance_data',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true,
});

export const mysqlService = {
  /**
   * Executes a parameterized query using the connection pool.
   * Returns rows array.
   */
  async executeQuery(query, params = []) {
    try {
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
    await pool.end();
  }
};

export default mysqlService;
