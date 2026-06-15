require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const userRes = await pool.query("SELECT * FROM dietbyrd_users WHERE name ILIKE '%kareem%' OR email ILIKE '%kareem%'");
    console.log("Users:", userRes.rows);
    const uids = userRes.rows.map(u => u.id);
    if (uids.length > 0) {
      const pRes = await pool.query("SELECT * FROM dietbyrd_patients WHERE user_id = ANY($1)", [uids]);
      console.log("Patients:", pRes.rows);
      const pids = pRes.rows.map(p => p.id);
      if (pids.length > 0) {
        const rpRes = await pool.query("SELECT * FROM dietbyrd_registered_patients WHERE patient_id = ANY($1)", [pids]);
        console.log("Reg Patients:", rpRes.rows);
        const rpids = rpRes.rows.map(rp => rp.id);
        if (rpids.length > 0) {
           const cRes = await pool.query("SELECT * FROM dietbyrd_consultations WHERE registered_patient_id = ANY($1)", [rpids]);
           console.log("Consultations:", cRes.rows);
        }
      }
    }
  } finally {
    pool.end();
  }
}
run();
