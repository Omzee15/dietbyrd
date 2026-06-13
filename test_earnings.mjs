import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query(`
      SELECT * FROM dietbyrd_doctor_earnings LIMIT 1
    `);
    console.log('Earnings Table exists.');
  } catch (e) {
    console.error('Earnings Error:', e.message);
  }
  process.exit(0);
}
test();
