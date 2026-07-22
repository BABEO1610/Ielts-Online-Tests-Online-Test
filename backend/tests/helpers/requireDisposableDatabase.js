const { URL } = require('node:url');

const BLOCKED_DATABASE_URL = 'postgresql://blocked:blocked@127.0.0.1:1/blocked_disposable_test';

const getDatabaseName = (candidate) => {
  if (!candidate) return '';
  try {
    return new URL(candidate).pathname.slice(1);
  } catch {
    return '';
  }
};

const configureDisposableDatabase = (env = process.env) => {
  const candidate = env.TEST_DATABASE_URL;
  const confirmed = env.ALLOW_DESTRUCTIVE_DB_TESTS === 'true';
  const separate = candidate && candidate !== env.DATABASE_URL;
  const databaseName = getDatabaseName(candidate);
  const clearlyTestDatabase = /(^|[_-])(test|ci)([_-]|$)/i.test(databaseName);
  if (confirmed && separate && clearlyTestDatabase) {
    env.DATABASE_URL = candidate;
    return true;
  }
  env.DATABASE_URL = BLOCKED_DATABASE_URL;
  return false;
};

module.exports = { configureDisposableDatabase };
