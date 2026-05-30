CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
  patient_profile_id INTEGER REFERENCES dietbyrd_patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('blood_report','prescription','other')),
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_patient ON patient_documents (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_patient_profile ON patient_documents (patient_profile_id, created_at DESC);
