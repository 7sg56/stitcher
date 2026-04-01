# Stitcher: Comprehensive Implementation Phases

This document provides a detailed phase-by-phase breakdown for building the **Stitcher** platform. It is designed to be fed to an AI assistant sequentially to maintain context and ensure all business rules, database constraints, and UI/UX requirements are met.

## Context Overview

**Stitcher** reduces the gap between students and teachers. Key concepts include:

- Role-based access (Admin, Teacher, Student) using Clerk and synced to the database.
- A fixed academic hierarchy (Courses -> Subjects -> Units/Exam Sections).
- Core interactive features: Quizzes, 30-Second Feedback, Doubt Clarification (course-bound chat), and a Resource Bridge.
- Automated moderation where profanity in chats leads to stacked attendance penalties.
- Data-driven dashboards: Student grids, weighted teacher reviews (preventing low-grade students from tanking ratings out of spite), and ML-ready insights like "Weak Concept" outlining based on quiz & feedback data.

---

## Phase 1: Foundation (Database & Authentication)

**Objective:** Set up the core database schema and user authentication flow.

**Key Tasks:**

1. **Database Schema Initialization:**
   - Define `ROLE` (student, teacher, admin) with app-level CHECK constraints.
   - Define `USER` and `ALIAS` tables.
   - Define `VIOLATION` table for future moderation stacking.
2. **Authentication Flow (Clerk):**
   - Implement Clerk for login/signup.
   - Set up Webhooks so that when a user registers via Clerk, they are securely created in the database and assigned an `ALIAS`.
3. **RBAC Middleware:**
   - Create route-protecting middleware that checks `user.role.name` before allowing access to teacher or admin pages.

**Context for AI:** *Ensure that user identity is completely abstracted from the authentication provider, and that no PII is ever exposed publicly (use ALIAS for display).*

---

## Phase 2: Core Academic Structure

**Objective:** Build the platform's skeleton—courses, subjects, and enrollments.

**Key Tasks:**

1. **Hierarchy Data Models:**
   - Define and implement `COURSE`, `SEMESTER_SUBJECT`, `UNIT`, and `EXAM_SECTION` tables.
2. **Administrative Dashboards:**
   - Build UI for Teachers/Admins to create and manage courses and subjects.
3. **Student Enrollment:**
   - Implement the `ENROLLMENT` table and build the flow for students to enroll in active courses.

**Context for AI:** *Courses dictate boundaries for everything else (sessions, chats, resources). Ensure soft-delete flags (`is_active`) are respected so inactive courses are hidden from students.*

---

## Phase 3: Sessions & Smart Attendance

**Objective:** Allow teachers to schedule class sessions and strictly track attendance.

**Key Tasks:**

1. **Session Management:**
   - Implement the `SESSION` table (course_id, teacher_id, topic, started_at, ended_at).
2. **Smart Attendance Logic:**
   - Implement the `ATTENDANCE` table.
   - Enforce the `UNIQUE(student_id, session_id)` database constraint.
   - Create attendance calculation logic: `(present_sessions / non_cancelled_sessions) * 100`.

**Context for AI:** *Attendance percentage is highly critical. Cancelled sessions must be excluded from calculations. Future penalty deductions from violations will impact these records.*

---

## Phase 4: Engagement & Content Features

**Objective:** Build out the tools that drive student-teacher interaction.

**Key Tasks:**

1. **Resource Bridge:**
   - Build the `RESOURCE` table with a constraint ensuring a file belongs to either a `UNIT` or an `EXAM_SECTION`, but never both: `CHECK (num_nonnulls(unit_id, exam_section_id) = 1)`.
   - Implement file upload functionality.
2. **Quizzes:**
   - Implement teacher-uploaded quizzes (`QUIZ`, `QUIZ_QUESTION`, `QUIZ_QUESTION_POOL`).
   - Build the student Quiz-taking UI (`QUIZ_ATTEMPT`, `QUIZ_RESPONSE`).
3. **Doubt Clarification (Chat):**
   - Create course-bound chat rooms/threads where students ask questions and teachers respond.
4. **30-Second Feedback:**
   - Implement functionality where a *Teacher manually triggers* a feedback window at the end of a session, prompting students to fill out a short rating/comment.

**Context for AI:** *The feedback window is explicitly initiated by the teacher, not strictly time-automated. The Doubt Chat is bounded by course enrollment.*

---

## Phase 5: Moderation, Dashboards, and Advanced Analytics

**Objective:** Implement the complex business rules surrounding discipline, teacher ratings, and session insights.

**Key Tasks:**

1. **Violations & Moderation Engine:**
   - Integrate a profanity filter into the Doubt Clarification chat.
   - If a student triggers the filter, log a `VIOLATION`. Stack these violations to automatically deduct attendance hours from that specific subject for that student.
2. **Student Dashboard:**
   - Build a comprehensive view for the student showing enrolled classes, faculty names, current grades, and attendance state.
3. **Asynchronous Session Aggregation (Redis Queue Needed):**
   - When a session ends, drop a single job into Redis (`AGGREGATE_SESSION`) to process all burst 30-sec feedback data.
   - **Weighted Reviews & Teacher Flagging:** As part of the async job, calculate teacher ratings based on student feedback, weighting the review by the student's grade (preventing low-grade students from tanking stats). Flag teachers with consistently poor scores.
   - **Teacher Portfolio & Insights (Weak Concepts):** Further down the async pipeline, aggregate data from `QUIZ_RESPONSE` and 30-sec `FEEDBACK` to outline a "Weak Concept" for the session, equipping the teacher for the next class.

**Context for AI:** *This phase requires careful SQL aggregation and introduces Redis + BullMQ. By deferring the heavy math (teacher scoring and weak concept outlining) until after the session's feedback window ends natively, we avoid database locks during the 30-second submission burst.*

---

## Phase 6: Future Integrations

**Objective:** Prep the system for external connections and ML logic.

**Key Tasks:**

1. **LMS Sync Planning:**
   - Define Webhooks/API surface for syncing with Moodle/Canvas.
2. **Attendance Prediction ML:**
   - Architect the database to accept model versions and pattern data for at-risk student warnings.

**Context for AI:** *Build out the `LMS_SYNC` and `ATTENDANCE_PREDICTION` database schemas, but stub the actual APIs for later implementation.*
