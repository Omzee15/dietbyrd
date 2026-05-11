-- Migration 009: Allow rd_id to be NULL in consultations for pending dietitian assignments
-- When a patient books via the public landing page, the consultation is created without
-- a specific dietitian. The system auto-assigns a dietitian 48h before the appointment.

ALTER TABLE dietbyrd_consultations
  ALTER COLUMN rd_id DROP NOT NULL;
