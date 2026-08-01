-- ============================================================
-- Adds course completion certificates tracking:
--   - Stores issued certificates per student and training program
--   - Provides unique certificate numbers for verification and PDF rendering
-- ============================================================

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, training_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_training ON certificates(training_id);
