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
        ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL;
    `);
    console.log("City column added to dietbyrd_patients successfully.");
  } catch (err) {
    console.error("Error running migration:", err);
  } finally {
    await pool.end();
  }
}

run();
