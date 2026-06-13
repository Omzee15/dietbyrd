import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_patient_documents (
        id UUID PRIMARY KEY,
        patient_id INTEGER REFERENCES dietbyrd_users(id),
        patient_profile_id INTEGER REFERENCES dietbyrd_patients(id),
        kind VARCHAR(50) NOT NULL,
        file_path TEXT,
        original_filename TEXT,
        mime_type VARCHAR(100),
        size_bytes INTEGER,
        uploaded_by INTEGER REFERENCES dietbyrd_users(id),
        file_data BYTEA,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created dietbyrd_patient_documents table");
  } catch(e) {
    console.log("Error:", e.message);
  } finally {
    pool.end();
  }
}
migrate();
