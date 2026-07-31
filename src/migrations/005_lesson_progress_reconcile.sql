-- ============================================================
-- Reconciles `lesson_progress` with the status/last_page model used
-- by myLearningController.js. An earlier version of this table may
-- have been created with different columns (position_seconds,
-- completed, completed_at) — CREATE TABLE IF NOT EXISTS silently
-- skips altering it, so this migration brings it up to date either way.
--
-- Safe to run whether your table has the old columns, the new ones
-- already, or doesn't exist at all yet.
--
-- Run once:
--   psql $DATABASE_URL -f src/migrations/005_lesson_progress_reconcile.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, lesson_id)
);

ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_page INT;

-- If the old columns exist, backfill status from `completed` before
-- dropping them, so any progress already recorded isn't lost.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'completed'
  ) THEN
    UPDATE lesson_progress
    SET status = CASE WHEN completed THEN 'completed' ELSE 'in_progress' END;

    ALTER TABLE lesson_progress DROP COLUMN completed;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'position_seconds'
  ) THEN
    ALTER TABLE lesson_progress DROP COLUMN position_seconds;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE lesson_progress DROP COLUMN completed_at;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
