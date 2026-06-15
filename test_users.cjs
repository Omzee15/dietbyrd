require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const result = await pool.query(`SELECT id, phone, role, name FROM dietbyrd_users WHERE name ILIKE '%kareem%'`);
    console.log(result.rows);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    pool.end();
  }
}
run();
