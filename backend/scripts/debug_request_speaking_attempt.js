require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const { generateAccessToken } = require('../src/utils/token.util');
const { pool } = require('../src/db/pool');

async function main() {
  const token = generateAccessToken({
    sub: '00000000-0000-4000-8000-000000000001',
    role: 'student',
    session_token: 'debug-session-token',
  });

  const response = await request(app)
    .post('/api/v1/submissions/speaking/attempt')
    .set('Cookie', [`accessToken=${token}`])
    .send({ test_id: '2' });

  console.log('DEBUG_RESPONSE_STATUS', response.status);
  console.log('DEBUG_RESPONSE_BODY', JSON.stringify(response.body, null, 2));
}

main()
  .catch((error) => {
    console.error('DEBUG_REQUEST_ERROR', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      query: error.query,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
