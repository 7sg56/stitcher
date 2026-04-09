-- ============================================
-- Phase 4b: Engagement & Content Features
-- Resources, Quizzes, Doubt Chat, Feedback Update
-- ============================================


-- Migrate exam_sections
ALTER TABLE exam_sections ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE;
ALTER TABLE exam_sections ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exam_sections DROP COLUMN IF EXISTS year;

-- Migrate sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60 NOT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id);
