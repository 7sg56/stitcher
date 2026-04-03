-- ============================================
-- Phase 2b: Course Enhancements
-- Drops and recreates courses + related tables
-- with passkey, teacher_id, teacher_title
-- Flattened hierarchy: units/exam_sections go
-- directly under courses (no semester_subjects)
-- ============================================

-- Add teacher_title to users (safe, no drop needed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_title TEXT;

-- Drop dependent tables in order (children first)
DROP TABLE IF EXISTS exam_sections CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS semester_subjects CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- ============================================
-- COURSES (with passkey + teacher_id)
-- ============================================
CREATE TABLE courses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  code             TEXT NOT NULL UNIQUE,
  semester_number  INT NOT NULL,
  department       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  passkey          TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  teacher_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE UNIQUE INDEX idx_courses_passkey ON courses(passkey);

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

CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

-- ============================================
-- SESSIONS
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
-- UNITS (directly under courses)
-- ============================================
CREATE TABLE units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  unit_number   INT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,

  UNIQUE(course_id, unit_number)
);

CREATE INDEX idx_units_course_id ON units(course_id);

-- ============================================
-- EXAM SECTIONS (directly under courses)
-- ============================================
CREATE TABLE exam_sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  year          INT NOT NULL,
  exam_board    TEXT,

  UNIQUE(course_id, type, year)
);

CREATE INDEX idx_exam_sections_course_id ON exam_sections(course_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
