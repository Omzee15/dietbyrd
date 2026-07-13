-- dietbyrd_user_sessions backs the entire authentication system (every
-- login issues a row here, and every authenticated API request looks up
-- its Bearer token against it). It was previously only ever created by
-- running the untracked root-level script `run_migration.js` directly
-- against production - it was never part of the tracked migrations/
-- sequence, so a fresh database created from migrations/001-019 alone
-- would be missing it entirely and the app would be unable to log
-- anyone in. This migration formalizes it. Safe to run even if the
-- table already exists (idempotent).

CREATE TABLE IF NOT EXISTS dietbyrd_user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON dietbyrd_user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON dietbyrd_user_sessions(user_id);
