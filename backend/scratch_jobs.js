const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.exuuhghnjcihypchzmym:uizz0Fz13t063anW@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  const jobs = await client.query(`
    SELECT id, status, stage, last_error_code, last_error_message, created_at, finished_at
    FROM ai_grading_jobs
    WHERE submission_type = 'speaking'
    ORDER BY created_at DESC LIMIT 3;
  `);
  console.log(JSON.stringify(jobs.rows, null, 2));
  await client.end();
}

run().catch(console.error);
