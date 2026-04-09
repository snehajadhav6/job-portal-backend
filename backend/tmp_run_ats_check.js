require('dotenv').config();
const pool = require('./config/db');
const { evaluateResumeATS } = require('./services/atsEvaluator');

async function run() {
  try {
    const query = `
      SELECT a.id, a.resume_url, j.title, j.description
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.resume_url IS NOT NULL AND a.resume_url <> ''
      ORDER BY a.applied_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query);
    if (!result.rows.length) {
      console.log('NO_RESUMES_FOUND');
      process.exit(0);
    }

    const row = result.rows[0];
    console.log('APPLICATION_ID', row.id);
    console.log('JOB_TITLE', row.title || '');
    console.log('HAS_OPENROUTER_KEY', !!process.env.OPENROUTER_API_KEY);
    console.log('MODEL', process.env.OPENROUTER_ATS_MODEL || 'meta-llama/llama-3.3-70b-instruct:free');

    const score = await evaluateResumeATS(row.resume_url, row.description || '');
    console.log('ATS_SCORE', score);
    process.exit(0);
  } catch (error) {
    console.error('RUN_ERROR', error.message);
    process.exit(1);
  }
}

run();
