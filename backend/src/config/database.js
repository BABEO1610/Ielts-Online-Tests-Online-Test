/**
 * @file backend/src/config/database.js
 * @description Database configuration file
 */

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
  // Supabase yêu cầu SSL — rejectUnauthorized: false cho phép self-signed cert
  ssl: { rejectUnauthorized: false },
};

module.exports = dbConfig;
