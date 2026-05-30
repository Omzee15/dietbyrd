-- Migration 013: allow interview_sent status for join requests
-- Date: 2026-05-30

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'dietbyrd_join_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE dietbyrd_join_requests DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE dietbyrd_join_requests
    ADD CONSTRAINT dietbyrd_join_requests_status_check
    CHECK (status IN ('pending', 'interview_sent', 'approved', 'rejected'));
END $$;
