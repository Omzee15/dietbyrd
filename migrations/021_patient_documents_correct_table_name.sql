-- Corrective migration: migrations 015 and 019 created/altered a table
-- named `patient_documents` (no dietbyrd_ prefix). The application code
-- has only ever queried `dietbyrd_patient_documents` (with the prefix,
-- matching every other table in this schema) - that table was actually
-- created on production by an untracked root-level script,
-- `migrate_documents.js`, run manually and never captured as a proper
-- migration. As a result the two prior migration files don't describe
-- the table the app actually uses. This migration creates the table
-- under its real name so a fresh database matches production. Safe to
-- run even if it already exists (idempotent). The old mis-named
-- `patient_documents` table, if it exists from a fresh run of 015/019,
-- is left in place rather than dropped, since we can't be sure nothing
-- external depends on it - it is simply unused by the application.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dietbyrd_patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
  patient_profile_id INTEGER REFERENCES dietbyrd_patients(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL CHECK (kind IN ('blood_report', 'prescription', 'other')),
  file_path TEXT,
  original_filename TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  file_data BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON dietbyrd_patient_documents (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_documents_profile ON dietbyrd_patient_documents (patient_profile_id, created_at DESC);
