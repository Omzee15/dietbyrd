import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const docResult = await pool.query(
      `SELECT d.*, u.phone, u.is_active
       FROM dietbyrd_doctors d
       LEFT JOIN dietbyrd_users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [9]
    );
    console.log("Doctor:", docResult.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}
test();
