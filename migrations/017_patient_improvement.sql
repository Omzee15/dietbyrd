-- 017_patient_improvement.sql
ALTER TABLE dietbyrd_patients
  ADD COLUMN IF NOT EXISTS improvement_score SMALLINT CHECK (improvement_score IS NULL OR (improvement_score BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS improvement_updated_by INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS improvement_updated_at TIMESTAMP NULL;
