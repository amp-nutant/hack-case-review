import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  ssl: config.postgres.ssl,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Set schema search path
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${config.postgres.schema}, public`);
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = async () => {
  const client = await pool.connect();
  await client.query(`SET search_path TO ${config.postgres.schema}, public`);
  return client;
};

/**
 * Test the connection
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, current_schema() as schema');
    console.log(`✅ PostgreSQL connected: ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`);
    console.log(`   Schema: ${result.rows[0].schema}, Time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
};

/**
 * Close all connections
 */
export const closePool = async () => {
  await pool.end();
  console.log('PostgreSQL pool closed');
};

export default pool;
