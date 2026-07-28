-- ============================================================
-- Assessments (quizzes) + Questions
-- Run once: psql $DATABASE_URL -f src/migrations/002_assessments_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY,
  attached_to_type TEXT NOT NULL,
  attached_to_id UUID NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  passing_percent NUMERIC NOT NULL DEFAULT 60,
  time_limit_minutes INT,
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
  show_score_mode TEXT NOT NULL DEFAULT 'after_submit',
  max_attempts INT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_assessments_attached_to_type CHECK (attached_to_type IN ('lesson', 'module', 'training')),
  CONSTRAINT chk_assessments_show_score_mode CHECK (show_score_mode IN ('instant', 'after_submit')),
  CONSTRAINT chk_assessments_status CHECK (status IN ('draft', 'published'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_assessments_attach
  ON assessments(attached_to_type, attached_to_id);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  marks NUMERIC NOT NULL DEFAULT 1,
  time_limit_seconds INT,
  default_score NUMERIC NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_questions_type CHECK (
    question_type IN ('multiple_choice', 'fill_gap', 'ordering', 'match_pairs', 'free_text')
  )
);

CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_id);
