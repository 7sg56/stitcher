-- ============================================
-- Stitcher MVP Schema
-- Run in Supabase SQL Editor or via CLI
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ROLES
-- ============================================
CREATE TABLE roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE CHECK (name IN ('student', 'teacher', 'admin'))
);

-- Seed default roles
INSERT INTO roles (name) VALUES ('student'), ('teacher'), ('admin');

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id           UUID NOT NULL REFERENCES roles(id),
  clerk_id          TEXT NOT NULL UNIQUE,
  real_name         TEXT,
  real_email        TEXT,
  real_phone        TEXT,
  is_shadow_banned  BOOLEAN NOT NULL DEFAULT FALSE,
  profanity_score   INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- ============================================
-- ALIASES
-- ============================================
CREATE TABLE aliases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_aliases_user_id ON aliases(user_id);

-- ============================================
-- VIOLATIONS
-- ============================================
CREATE TABLE violations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  severity        INT NOT NULL DEFAULT 1,
  hours_deducted  INT NOT NULL DEFAULT 0,
  content_ref     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE courses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  code             TEXT NOT NULL UNIQUE,
  semester_number  INT NOT NULL,
  department       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================
-- ENROLLMENTS
-- ============================================
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, course_id)
);

-- ============================================
-- SESSIONS (class sessions, not auth sessions)
-- ============================================
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES users(id),
  topic         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  location      TEXT,
  is_cancelled  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- ATTENDANCE
-- ============================================
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'absent',
  hours_deducted  INT NOT NULL DEFAULT 0,
  source          TEXT DEFAULT 'manual',
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, session_id)
);

-- ============================================
-- FEEDBACK
-- ============================================
CREATE TABLE feedback (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES users(id),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rating        INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  is_anonymous  BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, session_id)
);

-- ============================================
-- DOUBTS
-- ============================================
CREATE TABLE doubts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raised_by           UUID NOT NULL REFERENCES users(id),
  assigned_teacher_id UUID REFERENCES users(id),
  session_id          UUID REFERENCES sessions(id) ON DELETE SET NULL,
  topic               TEXT,
  type                TEXT,
  content             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open',
  vote_count          INT NOT NULL DEFAULT 0,
  asked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

-- ============================================
-- DOUBT VOTES
-- ============================================
CREATE TABLE doubt_votes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doubt_id  UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id),
  voted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(doubt_id, user_id)
);

-- ============================================
-- Row Level Security (enable but keep open for service role)
-- ============================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_votes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default, so no policies needed for backend.
-- Add RLS policies later when you introduce direct client-side Supabase access.
