-- ============================================================
-- Enables the "set your password via emailed link" flow used when:
--   - an admin creates a student (POST /api/admin/students)
--   - an admin resets a student's password
--   - an admin resends a setup link to a student stuck without one
--
-- We never email a plaintext password. Instead we email a one-time link
-- containing a random token; only its SHA-256 hash is stored here, same
-- principle as a password reset flow.
--
-- Run once:
--   psql $DATABASE_URL -f src/migrations/004_account_setup_tokens.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS account_setup_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'set_password', -- 'set_password' | 'reset_password'
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setup_tokens_user ON account_setup_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_tokens_hash ON account_setup_tokens(token_hash);
