-- ============================================================
-- Allow assessments to attach to lessons for engagement quizzes.
-- Run after 002_assessments_schema.sql.
-- ============================================================

ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS chk_assessments_attached_to_type;

ALTER TABLE assessments
  ADD CONSTRAINT chk_assessments_attached_to_type
  CHECK (attached_to_type IN ('lesson', 'module', 'training'));
