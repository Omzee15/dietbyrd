require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    let sql = `
      SELECT
        c.*,
        rd.name AS dietician_name,
        rd.qualification AS dietician_qualification,
        p.name AS patient_name
      FROM dietbyrd_consultations c
      LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
      WHERE rp.patient_id = $1
    `;
    const params = [60];

    sql += ` ORDER BY c.scheduled_at DESC`;
    const result = await pool.query(sql, params);
    console.log(result.rows);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    pool.end();
  }
}
run();
