-- ============================================================
-- 007_rbac_schema.sql
-- Role-Based Access Control (RBAC), Permissions & User Status
-- ============================================================

-- 1. Add status and permissions columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Upgrade existing 'admin' users to 'super_admin' with wildcard permissions ['*']
UPDATE users
SET role = 'super_admin',
    permissions = '["*"]'::jsonb,
    status = 'active'
WHERE role = 'admin';

-- 3. Create index on status and role for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
