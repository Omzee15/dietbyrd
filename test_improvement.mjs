import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://dietbyrd:dietbyrd@localhost:5432/dietbyrd",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const roles = await pool.query("SELECT DISTINCT role FROM dietbyrd_users");
    console.log("Roles:", roles.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
