-- Ensure join_requests.user_id is nullable on delete to prevent FK violations
-- Date: 2026-06-04

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'dietbyrd_join_requests'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%(user_id)%'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE dietbyrd_join_requests DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE dietbyrd_join_requests
    ADD CONSTRAINT dietbyrd_join_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES dietbyrd_users(id)
    ON DELETE SET NULL;
END $$;
