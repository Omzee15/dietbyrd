import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, ".env"), override: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Running migration...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
        session_token UUID NOT NULL UNIQUE,
        device_fingerprint VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_dietbyrd_sessions_token ON dietbyrd_user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_dietbyrd_sessions_user ON dietbyrd_user_sessions(user_id);
    `);
    console.log("Table dietbyrd_user_sessions created or already exists.");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
        consent_text_version TEXT NOT NULL,
        ip_address VARCHAR(45) NULL,
        accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_dietbyrd_consents_user ON dietbyrd_user_consents(user_id);
    `);
    console.log("Table dietbyrd_user_consents created or already exists.");

    // Update schema.sql to match for future
    console.log("Migration successful.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

run();
