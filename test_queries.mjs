import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.improvement_score,
        p.improvement_updated_at,
        p.phone                       AS phone,
        r.referred_at                 AS referral_date,
        COALESCE(c.status::text, 'pending') AS consultation_status,
        (CASE WHEN pay.id IS NOT NULL THEN 'paid' ELSE 'unpaid' END)::text AS payment_status,
        c.scheduled_at                AS next_consultation_at,
        rd.name                       AS assigned_dietitian_name
      FROM dietbyrd_referrals r
      JOIN dietbyrd_patients p ON p.id = r.patient_id
      LEFT JOIN LATERAL (
        SELECT c2.id, c2.status, c2.scheduled_at, c2.rd_id
        FROM dietbyrd_consultations c2
        JOIN dietbyrd_registered_patients rp ON rp.id = c2.registered_patient_id
        WHERE rp.patient_id = p.id
        ORDER BY c2.scheduled_at DESC NULLS LAST, c2.created_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN dietbyrd_registered_dietitians rd ON rd.id = c.rd_id
      LEFT JOIN dietbyrd_payments pay
        ON pay.patient_id = p.id AND pay.status = 'success'
      WHERE r.doctor_id = 9
      ORDER BY r.referred_at DESC
    `);
    console.log('Query 1 Success. Returned rows:', res.rows.length);
  } catch (e) {
    console.error('Query 1 Error:', e.message);
  }
  process.exit(0);
}
test();
