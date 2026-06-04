/**
 * @file backend/src/db/pool.js
 * @description PostgreSQL connection pool initialization
 */

const { Pool } = require('pg');
const dbConfig = require('../config/database');

// EARS[Ubiquitous]: THE system SHALL create the pool with max=20,
// idleTimeoutMillis=30000, connectionTimeoutMillis=10000.
const pool = new Pool(dbConfig);

// EARS[Event]: WHEN pool emits 'error', THE system SHALL have a handler.
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Log error but do not exit process unless necessary
});

/**
 * Test the database connection
 * EARS[Event]: WHEN testConnection is called with a reachable DB,
 *              THE system SHALL return the server timestamp.
 * EARS[Unwanted]: WHERE the DB is unreachable, THE system SHALL log and
 *                 re-throw the error.
 */
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS now');
    return result.rows[0].now;
  } catch (err) {
    console.error('Database connection test failed:', err);
    throw err; // Re-throw to satisfy TC-001-04
  } finally {
    if (client) {
      // Constitution SEC-03: Client always released
      client.release();
    }
  }
};

module.exports = {
  pool,
  testConnection,
};
