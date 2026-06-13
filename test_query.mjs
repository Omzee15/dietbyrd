import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        p.*,
        u.phone AS user_phone,
        COALESCE(p.dietary_preference, rp.dietary_preference::text) AS dietary_preference,
        rp.food_restrictions,
        rp.assigned_rd_id,
        rd.name AS assigned_dietician_name,
        rd.qualification AS assigned_dietician_qualification,
        ref.doctor_id AS referring_doctor_id,
        d.name AS referring_doctor_name,
        d.qualification AS referring_doctor_qualification,
        d.clinic_name AS referring_doctor_clinic,
        (CASE
          WHEN COALESCE(payment_summary.has_razorpay, false) = true
            OR EXISTS (
              SELECT 1
              FROM dietbyrd_payments dp
              WHERE (dp.patient_id = p.id OR (rp.id IS NOT NULL AND dp.registered_patient_id = rp.id))
                AND dp.status::text IN ('success', 'paid', 'captured')
            ) THEN 'paid'
          ELSE 'unpaid'
        END) AS payment_status,
        COALESCE(payment_summary.payment_history, '[]'::json) AS payment_history,
        true AS registration_completed,
        (
          COALESCE(payment_summary.has_razorpay, false) = true
          OR EXISTS (
            SELECT 1
            FROM dietbyrd_payments dp
            WHERE (dp.patient_id = p.id OR (rp.id IS NOT NULL AND dp.registered_patient_id = rp.id))
              AND dp.status::text IN ('success', 'paid', 'captured')
          )
        ) AS payment_completed,
        EXISTS (
          SELECT 1
          FROM dietbyrd_consultations c
          WHERE c.registered_patient_id = rp.id
            AND c.scheduled_at > NOW()
            AND c.status IN ('scheduled', 'confirmed')
        ) AS appointment_completed,
        EXISTS (
          SELECT 1
          FROM dietbyrd_consultations c
          WHERE c.registered_patient_id = rp.id
            AND c.status = 'completed'
        ) AS consultation_completed
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      LEFT JOIN dietbyrd_referrals ref ON ref.patient_id = p.id
      LEFT JOIN dietbyrd_doctors d ON ref.doctor_id = d.id
      LEFT JOIN LATERAL (
        SELECT
          (COUNT(*) FILTER (WHERE pay.status::text IN ('success', 'paid', 'captured')) > 0) AS has_razorpay,
          COALESCE(
            json_agg(
              json_build_object(
                'payment_id', pay.id,
                'amount', pay.amount,
                'currency', pay.currency,
                'status', pay.status,
                'consultations_purchased', pay.consultations_purchased,
                'payment_method', pay.payment_method,
                'razorpay_payment_id', pay.razorpay_payment_id,
                'paid_at', pay.updated_at,
                'created_at', pay.created_at
              )
              ORDER BY pay.created_at DESC
            ) FILTER (WHERE pay.id IS NOT NULL),
            '[]'::json
          ) AS payment_history
        FROM dietbyrd_razorpay_payments pay
        WHERE pay.patient_id = p.id
      ) AS payment_summary ON true
      WHERE p.id = $1
    `, [61]);
    console.log("Success:", res.rows);
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    pool.end();
  }
}

main();
