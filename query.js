import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/dietbyrd'
});

async function run() {
  const res = await pool.query('SELECT id, scheduled_at, status FROM dietbyrd_consultations ORDER BY id DESC LIMIT 5;');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

run();
