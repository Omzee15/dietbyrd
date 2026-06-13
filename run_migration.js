import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE dietbyrd_patients
        ADD COLUMN IF NOT EXISTS improvement_score SMALLINT CHECK (improvement_score IS NULL OR (improvement_score BETWEEN 1 AND 10)),
        ADD COLUMN IF NOT EXISTS improvement_updated_by INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS improvement_updated_at TIMESTAMP NULL;
    `);
    console.log("Improvement columns added to dietbyrd_patients successfully.");
  } catch (err) {
    console.error("Error running migration:", err);
  } finally {
    await pool.end();
  }
}

run();
