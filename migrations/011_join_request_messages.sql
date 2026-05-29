-- Migration 011: Join request messages
-- Date: 2026-05-29
-- Purpose: Store admin-to-applicant messages for join requests

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dietbyrd_join_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_request_id INTEGER NOT NULL REFERENCES dietbyrd_join_requests(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ops_manager','mlt_intern','founder','tech_lead')),
  recipient_user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jrm_recipient_unread
  ON dietbyrd_join_request_messages (recipient_user_id)
  WHERE read_at IS NULL;
