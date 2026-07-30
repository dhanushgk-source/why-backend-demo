-- ============================================================
-- Adds PPT as a lesson content type, alongside video/pdf/notes.
--
-- Run once against your Postgres database, e.g.:
--   psql $DATABASE_URL -f src/migrations/002_lesson_ppt.sql
-- ============================================================

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ppt_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ppt_file_id TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ppt_name TEXT;

-- content_type now also accepts 'ppt' (still no DB-level constraint on
-- this column — validated in the controller, same as before).
