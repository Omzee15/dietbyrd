-- Migration 006: Add email column to users and patients tables
-- Date: 2026-05-10
-- Purpose: Support email collection during patient registration

-- Add email to dietbyrd_users table
ALTER TABLE dietbyrd_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

-- Add unique constraint on email (allowing NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
ON dietbyrd_users (email) 
WHERE email IS NOT NULL;

-- Add email to dietbyrd_patients table for redundancy
ALTER TABLE dietbyrd_patients 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

COMMENT ON COLUMN dietbyrd_users.email IS 'User email address (optional)';
COMMENT ON COLUMN dietbyrd_patients.email IS 'Patient email address (optional, synced from users table)';
