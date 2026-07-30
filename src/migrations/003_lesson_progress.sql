-- ============================================================
-- Adds per-student lesson progress tracking, powering:
--   - "Continue where you left off" on the student dashboard
--   - the resume-page behavior inside the PDF viewer
--   - checkmarks / in-progress dots in the course tree sidebar
--
-- Run once against your Postgres database, e.g.:
--   psql $DATABASE_URL -f src/migrations/003_lesson_progress.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  last_page INT, -- meaningful for content_type='pdf' only; NULL otherwise
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
