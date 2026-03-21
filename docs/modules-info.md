# Stitcher — Module to Table Mapping

## `auth`
Handles Clerk integration and role-based access control.

| Table | Purpose |
|-------|---------|
| `ROLE` | Defines user roles (student, teacher, admin) and their permissions |
| `USER` | Core user record — stores real identity, Clerk ID, profanity score, shadow ban flag |
| `ALIAS` | Public-facing decoupled identity shown to others; real data hidden unless abuse is flagged |

---

## `users`
Manages user profile, moderation state, and portfolio.

| Table | Purpose |
|-------|---------|
| `USER` | Shared with `auth` — owns profanity score and shadow ban logic |
| `ALIAS` | Managed here for profile update flows |
| `VIOLATION` | Tracks each profanity/abuse event, severity level, and hours of attendance deducted |
| `PORTFOLIO` | Teacher-specific profile — bio, course history, average feedback score |

---

## `courses`
Manages course structure, semester subjects, units, and LMS sync.

| Table | Purpose |
|-------|---------|
| `COURSE` | Top-level course record with semester number and department |
| `ENROLLMENT` | Links students and teachers to courses with status tracking |
| `SEMESTER_SUBJECT` | Each subject within a course semester |
| `UNIT` | 5 units per subject — stores titles and descriptions |
| `EXAM_SECTION` | CT/Exam section per subject — used for PYQ storage |
| `LMS_SYNC` | Maps internal courses and users to external LMS records |

---

## `resources`
Handles all file uploads — notes, PPTs, docs, and PYQs.

| Table | Purpose |
|-------|---------|
| `RESOURCE` | Single table for all uploadable content; `resource_category` and nullable FKs distinguish notes (via `unit_id`) from PYQs (via `exam_section_id`) |

---

## `attendance`
Tracks session-level attendance and feeds the prediction engine.

| Table | Purpose |
|-------|---------|
| `SESSION` | Shared across modules — represents a single class session with topic and time |
| `ATTENDANCE` | Per-student per-session attendance record; `source` field distinguishes manual, smart, or violation-driven deductions |
| `ATTENDANCE_PREDICTION` | ML-computed risk assessment per student per course |

---

## `feedback`
Manages 30-second post-session feedback collection.

| Table | Purpose |
|-------|---------|
| `FEEDBACK` | Stores rating and optional comment per student per session; supports anonymous submissions |

---

## `doubts`
Tracks student doubts, their type, topic, assigned teacher, and how many students share them.

| Table | Purpose |
|-------|---------|
| `DOUBT` | Core doubt record — links to session, subject, topic, assigned teacher, and tracks resolution status |
| `DOUBT_VOTE` | Junction table counting how many students have the same doubt |

---

## `quiz`
Handles quiz creation, random question selection, delivery, and response tracking.

| Table | Purpose |
|-------|---------|
| `QUIZ` | Quiz definition scoped to a course and subject |
| `QUIZ_QUESTION` | Individual questions tagged by topic and difficulty; `options` stored as serialized string |
| `QUIZ_ATTEMPT` | One record per student per quiz attempt with aggregate score |
| `QUIZ_RESPONSE` | Atomic per-question answer record used for weak concept analysis |

---

## `dashboard`
Aggregates and serves analytics for both students and teachers.

| Table | Purpose |
|-------|---------|
| `STUDENT_DASHBOARD` | Per-student per-course snapshot — attendance %, quiz score, marks summary, weak concepts list |
| `TEACHER_INSIGHT` | Per-teacher per-course report — class quiz avg, avg feedback rating, poor feedback entries for review, attendance trend, topic weakness map |
| `WEAK_CONCEPT` | Granular per-student per-topic accuracy derived from quiz responses; drives the weak concept analysis on the student dashboard |

---

## Summary Table

| Module | Tables Owned |
|--------|-------------|
| `auth` | ROLE, USER, ALIAS |
| `users` | USER, ALIAS, VIOLATION, PORTFOLIO |
| `courses` | COURSE, ENROLLMENT, SEMESTER_SUBJECT, UNIT, EXAM_SECTION, LMS_SYNC |
| `resources` | RESOURCE |
| `attendance` | SESSION, ATTENDANCE, ATTENDANCE_PREDICTION |
| `feedback` | FEEDBACK |
| `doubts` | DOUBT, DOUBT_VOTE |
| `quiz` | QUIZ, QUIZ_QUESTION, QUIZ_ATTEMPT, QUIZ_RESPONSE |
| `dashboard` | STUDENT_DASHBOARD, TEACHER_INSIGHT, WEAK_CONCEPT |

> Note: `SESSION` is a shared dependency used by `attendance`, `feedback`, and `doubts`. It lives in the `attendance` module as the owner but is referenced across modules via FK. `USER` and `COURSE` are similarly cross-cutting — owned by `auth`/`users` and `courses` respectively, referenced everywhere else.