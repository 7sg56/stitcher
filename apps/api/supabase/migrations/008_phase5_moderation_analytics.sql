-- ============================================
-- Phase 5: Moderation, Dashboards & Analytics
-- Violations scoping, teacher ratings,
-- session insights, aggregation job tracking
-- ============================================

-- ============================================
-- VIOLATIONS: add course scoping
-- ============================================
ALTER TABLE violations ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_violations_course_id ON violations(course_id);
CREATE INDEX IF NOT EXISTS idx_violations_user_id ON violations(user_id);

-- ============================================
-- TEACHER RATINGS (aggregated per teacher per course)
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_ratings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  weighted_avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews       INT NOT NULL DEFAULT 0,
  is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
  last_aggregated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(teacher_id, course_id)
);

CREATE INDEX idx_teacher_ratings_teacher_id ON teacher_ratings(teacher_id);
CREATE INDEX idx_teacher_ratings_course_id ON teacher_ratings(course_id);

-- ============================================
-- SESSION INSIGHTS (weak concepts per session)
-- ============================================
CREATE TABLE IF NOT EXISTS session_insights (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  weak_concepts     JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_accuracy_pct NUMERIC(5,2),
  avg_rating        NUMERIC(3,2),
  total_feedback    INT NOT NULL DEFAULT 0,
  aggregated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(session_id)
);

CREATE INDEX idx_session_insights_session_id ON session_insights(session_id);

-- ============================================
-- AGGREGATION JOBS (idempotent job tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS aggregation_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  queued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  error         TEXT,

  UNIQUE(session_id)
);

CREATE INDEX idx_aggregation_jobs_session_id ON aggregation_jobs(session_id);
CREATE INDEX idx_aggregation_jobs_status ON aggregation_jobs(status);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE teacher_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregation_jobs ENABLE ROW LEVEL SECURITY;
