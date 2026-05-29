-- Migration 012: Doctor commissions
-- Adds commission percent to users and creates doctor commissions table

ALTER TABLE dietbyrd_users
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2);

ALTER TABLE dietbyrd_users
  ALTER COLUMN commission_percent SET DEFAULT 15.00;

UPDATE dietbyrd_users
SET commission_percent = 15.00
WHERE role = 'doctor' AND commission_percent IS NULL;

CREATE TABLE IF NOT EXISTS dietbyrd_doctor_commissions (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES dietbyrd_users(id),
  patient_id INT NOT NULL REFERENCES dietbyrd_users(id),
  payment_id TEXT NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending','paid','void')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dc_doctor ON dietbyrd_doctor_commissions (doctor_id);
