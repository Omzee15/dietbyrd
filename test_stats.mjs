import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const id = 9;
  
  try {
    const referredResult = await pool.query(
      `SELECT COUNT(DISTINCT r.id) as total_referred
       FROM dietbyrd_referrals r
       WHERE r.doctor_id = $1 OR r.assistant_id IN (
         SELECT id FROM dietbyrd_assistants WHERE doctor_id = $1
       )`,
      [id]
    );
    console.log('Query 1 Success:', referredResult.rows[0]);
  } catch(e) {
    console.error('Query 1 Error:', e.message);
  }

  try {
    const onboardedResult = await pool.query(
      `SELECT COUNT(DISTINCT s.registered_patient_id) as total_onboarded
       FROM dietbyrd_subscriptions s
       JOIN dietbyrd_registered_patients rp ON s.registered_patient_id = rp.id
       JOIN dietbyrd_referrals r ON rp.patient_id = r.patient_id
       WHERE (r.doctor_id = $1 OR r.assistant_id IN (
         SELECT id FROM dietbyrd_assistants WHERE doctor_id = $1
       ))
       AND s.status IN ('active', 'paused')`,
      [id]
    );
    console.log('Query 2 Success:', onboardedResult.rows[0]);
  } catch(e) {
    console.error('Query 2 Error:', e.message);
  }

  try {
    const commissionResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_commission
       FROM dietbyrd_doctor_earnings
       WHERE doctor_id = $1`,
      [id]
    );
    console.log('Query 3 Success:', commissionResult.rows[0]);
  } catch(e) {
    console.error('Query 3 Error:', e.message);
  }

  process.exit(0);
}
test();
