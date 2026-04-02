-- ============================================
-- Phase 2: Core Academic Structure
-- Adds semester_subjects, units, exam_sections
-- ============================================

-- ============================================
-- SEMESTER SUBJECTS
-- ============================================
CREATE TABLE semester_subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  unit_count  INT NOT NULL DEFAULT 0,

  UNIQUE(course_id, code)
);

CREATE INDEX idx_semester_subjects_course_id ON semester_subjects(course_id);

-- ============================================
-- UNITS
-- ============================================
CREATE TABLE units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id    UUID NOT NULL REFERENCES semester_subjects(id) ON DELETE CASCADE,
  unit_number   INT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,

  UNIQUE(subject_id, unit_number)
);

CREATE INDEX idx_units_subject_id ON units(subject_id);

-- ============================================
-- EXAM SECTIONS
-- ============================================
CREATE TABLE exam_sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id    UUID NOT NULL REFERENCES semester_subjects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  year          INT NOT NULL,
  exam_board    TEXT,

  UNIQUE(subject_id, type, year)
);

CREATE INDEX idx_exam_sections_subject_id ON exam_sections(subject_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE semester_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
