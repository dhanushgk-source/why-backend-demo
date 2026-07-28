-- ============================================================
-- LMS schema: students, training_programs, enrollments,
-- modules, lessons
--
-- Run this once against your Postgres database, e.g.:
--   psql $DATABASE_URL -f src/migrations/001_lms_schema.sql
--
-- Assumes the existing `users` table already has:
--   id UUID PRIMARY KEY, full_name, email, phone, password_hash, role
-- (role currently supports 'admin' / default applicant role;
--  this migration adds 'student' as another valid value — no
--  enum/constraint exists on role today, so nothing to alter.)
-- ============================================================

-- ---------- students ----------
-- One row per student, linked 1:1 to a `users` row that holds
-- their login credentials (email/password_hash/role='student').
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  employee_id TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- ---------- training_programs ----------
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  duration NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  description TEXT,
  thumbnail_url TEXT,
  thumbnail_file_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- enrollments (student <-> training) ----------
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, training_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_training ON enrollments(training_id);

-- ---------- modules ----------
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_training ON modules(training_id);

-- ---------- lessons ----------
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- 'video' | 'pdf' | 'notes'
  duration_minutes INT,
  video_url TEXT,        -- external link (YouTube/Vimeo) OR our proxy stream URL
  video_file_id TEXT,    -- Google Drive file id, if uploaded (not an external link)
  pdf_url TEXT,
  pdf_file_id TEXT,
  pdf_name TEXT,
  notes_content TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
