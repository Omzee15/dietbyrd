import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    await pool.query(`ALTER TABLE dietbyrd_join_requests DROP CONSTRAINT IF EXISTS dietbyrd_join_requests_status_check`);
    await pool.query(`ALTER TABLE dietbyrd_join_requests ADD CONSTRAINT dietbyrd_join_requests_status_check CHECK (status IN ('pending', 'interview_sent', 'approved', 'rejected'))`);
    console.log("Fixed constraint!");
  } catch(e) {
    console.log("Error:", e.message);
  } finally {
    pool.end();
  }
}
fix();
