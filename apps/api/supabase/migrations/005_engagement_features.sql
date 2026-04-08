-- ============================================
-- Phase 3-4: Engagement & Content Features
-- Resources, Quizzes, Doubt Chat, Feedback
-- ============================================

-- ============================================
-- RESOURCES (files attached to unit OR exam_section, never both)
-- ============================================
CREATE TABLE resources (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  unit_id          UUID REFERENCES units(id) ON DELETE CASCADE,
  exam_section_id  UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
  uploaded_by      UUID NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  description      TEXT,
  file_url         TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  file_size        INT,
  mime_type        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (num_nonnulls(unit_id, exam_section_id) = 1)
);

CREATE INDEX idx_resources_course_id ON resources(course_id);
CREATE INDEX idx_resources_unit_id ON resources(unit_id);
CREATE INDEX idx_resources_exam_section_id ON resources(exam_section_id);

-- ============================================
-- QUIZZES (course + unit bound)
-- ============================================
CREATE TABLE quizzes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES units(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  duration_mins INT,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_quizzes_unit_id ON quizzes(unit_id);

-- ============================================
-- QUIZ QUESTIONS
-- ============================================
CREATE TABLE quiz_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
  points        INT NOT NULL DEFAULT 1,
  order_index   INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- ============================================
-- QUIZ QUESTION POOL (answer options for MCQ)
-- ============================================
CREATE TABLE quiz_question_pool (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id  UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text  TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_question_pool_question_id ON quiz_question_pool(question_id);

-- ============================================
-- QUIZ ATTEMPTS
-- ============================================
CREATE TABLE quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score        INT,
  max_score    INT,

  UNIQUE(quiz_id, student_id)
);

CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);

-- ============================================
-- QUIZ RESPONSES
-- ============================================
CREATE TABLE quiz_responses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id   UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES quiz_question_pool(id) ON DELETE SET NULL,
  text_answer  TEXT,
  is_correct   BOOLEAN,
  points_awarded INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_responses_attempt_id ON quiz_responses(attempt_id);

-- ============================================
-- FEEDBACK WINDOWS (teacher-triggered per session)
-- ============================================
CREATE TABLE feedback_windows (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  unit_id      UUID REFERENCES units(id) ON DELETE SET NULL,
  opened_by    UUID NOT NULL REFERENCES users(id),
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ,
  is_open      BOOLEAN NOT NULL DEFAULT TRUE,

  UNIQUE(session_id)
);

-- ============================================
-- DOUBT THREADS (course-bound discussion)
-- ============================================
CREATE TABLE doubt_threads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doubt_threads_course_id ON doubt_threads(course_id);

-- ============================================
-- DOUBT MESSAGES (messages in a thread)
-- ============================================
CREATE TABLE doubt_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id    UUID NOT NULL REFERENCES doubt_threads(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id),
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doubt_messages_thread_id ON doubt_messages(thread_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_messages ENABLE ROW LEVEL SECURITY;
