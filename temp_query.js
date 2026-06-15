require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT * FROM dietbyrd_patients WHERE name ILIKE '%kareem%'");
    console.log(res.rows);
  } finally {
    pool.end();
  }
}
run();
