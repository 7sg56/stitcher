-- ============================================
-- Phase 6: Public Teacher Profiles
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  designation TEXT,
  contact_email TEXT,
  orcid_id TEXT,
  personal_website TEXT,
  mastery_tags TEXT[] DEFAULT '{}',
  bio TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(teacher_id)
);

CREATE INDEX idx_teacher_profiles_teacher_id ON teacher_profiles(teacher_id);

ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
