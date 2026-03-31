# TechnoBuzz — Database Module Info

> Schema reference organized by MVP feature. Each module lists the tables it owns, their purpose, key constraints, and known edge cases.

---

## Roles & Users

**Tables:** `ROLE`, `USER`, `ALIAS`

### ROLE
Stores the three fixed roles of the platform.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| name | string | One of: `student`, `teacher`, `admin`. Enforce via CHECK constraint in app. |

No permissions column — role name is the permission. All access control is handled in middleware by checking `user.role.name`.

### USER
Core identity table. Linked to Clerk for auth.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | Internal ID |
| role_id | uuid FK → ROLE | Determines access level |
| clerk_id | string | External auth ID from Clerk |
| real_name / real_email / real_phone | string | PII — never expose publicly |
| is_shadow_banned | boolean | If true, user can post but content is hidden from others |
| profanity_score | int | Incrementing counter used to auto-flag/ban |
| created_at | timestamp | — |

### ALIAS
Each user can have a display identity (used in public-facing features like doubts, feedback).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| user_id | uuid FK → USER | — |
| display_name | string | Public-facing name |
| avatar_url | string | — |
| is_active | boolean | Only one alias should be active at a time — enforce in app |

---

## Violations

**Tables:** `VIOLATION`

Tracks moderation actions taken against users.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| user_id | uuid FK → USER | Who was penalized |
| type | string | e.g. `profanity`, `spam`, `harassment` |
| severity | int | 1–5 scale |
| hours_deducted | int | Attendance hours penalty if applicable |
| content_ref | string | Reference to the offending content (message ID, doubt ID, etc.) |
| created_at | timestamp | — |

---

## Courses & Enrollment

**Tables:** `COURSE`, `ENROLLMENT`

### COURSE
Top-level academic unit. A course contains subjects, sessions, and quizzes.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| name / code | string | e.g. "Computer Networks", "CS401" |
| semester_number | int | — |
| department | string | — |
| is_active | boolean | Soft-delete flag. Inactive courses are hidden from students. |

### ENROLLMENT
Join table linking students to courses.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| user_id | uuid FK → USER | Must be a student role |
| course_id | uuid FK → COURSE | — |
| status | string | `active`, `dropped`, `completed` |
| enrolled_at | timestamp | — |

---

## Subjects, Units & Exam Sections

**Tables:** `SEMESTER_SUBJECT`, `UNIT`, `EXAM_SECTION`

### SEMESTER_SUBJECT
A course is divided into subjects (e.g. Unit I–V of a syllabus).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| course_id | uuid FK → COURSE | — |
| name / code | string | e.g. "Data Structures", "CS401-DS" |
| unit_count | int | Total number of units in this subject |

### UNIT
A subdivision of a subject. Resources (notes, slides) are stored per unit.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| subject_id | uuid FK → SEMESTER_SUBJECT | — |
| unit_number | int | Ordering within the subject |
| title / description | string | — |

### EXAM_SECTION
Previous year question (PYQ) groupings per subject.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| subject_id | uuid FK → SEMESTER_SUBJECT | — |
| type | string | e.g. `mid-sem`, `end-sem` |
| year | int | Academic year |
| exam_board | string | University or board name |

---

## Resource Bridge

**Feature:** Resource Bridge  
**Tables:** `RESOURCE`

Central file/resource storage for the platform.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| uploaded_by | uuid FK → USER | Uploader (typically teacher) |
| unit_id | uuid FK → UNIT | Nullable |
| exam_section_id | uuid FK → EXAM_SECTION | Nullable |
| title | string | Display name |
| file_url | string | Storage URL |
| file_type | string | `pdf`, `pptx`, `mp4`, etc. |
| resource_category | string | `notes`, `pyq`, `slides`, `assignment` |
| download_count | int | Popularity metric |
| uploaded_at | timestamp | — |

**Constraint:** Exactly one of `unit_id` or `exam_section_id` must be non-null.  
Enforce with: `CHECK (num_nonnulls(unit_id, exam_section_id) = 1)`

A resource belongs either to a unit (study material) or an exam section (PYQ) — never both, never neither.

---

## Sessions

**Tables:** `SESSION`

Represents a single class session (lecture, lab, tutorial).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| course_id | uuid FK → COURSE | — |
| teacher_id | uuid FK → USER | Must be teacher role |
| topic | string | What was covered |
| started_at / ended_at | timestamp | — |
| location | string | Room number or "online" |
| is_cancelled | boolean | Cancelled sessions excluded from attendance % calculation |

---

## Smart Attendance

**Feature:** Smart Attendance, Student Attendance  
**Tables:** `ATTENDANCE`

One row per student per session.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| student_id | uuid FK → USER | — |
| session_id | uuid FK → SESSION | — |
| status | string | `present`, `absent`, `late`, `excused` |
| hours_deducted | int | Penalty hours if applicable |
| source | string | `manual`, `qr`, `geo`, `biometric` — how it was marked |
| marked_at | timestamp | — |

**Constraint:** `UNIQUE(student_id, session_id)` — one row per student per session, no duplicates.

**Attendance % formula:**
```
present_sessions / non_cancelled_sessions × 100
```
Always filter `SESSION.is_cancelled = false` before computing.

---

## 30-Second Feedback

**Feature:** 30-Second Feedback  
**Tables:** `FEEDBACK`

Collected at the end of each session within a short window.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| student_id | uuid FK → USER | — |
| session_id | uuid FK → SESSION | — |
| rating | int | 1–5 scale |
| comment | string | Optional text |
| is_anonymous | boolean | If true, hide student identity in teacher view |
| submitted_at | timestamp | — |

The 30-second window is enforced at the application layer, not the DB. Validate:  
`submitted_at BETWEEN session.started_at AND session.ended_at + interval '5 minutes'`

---

## Teacher Portfolio

**Feature:** Teacher Portfolio  
**Tables:** `PORTFOLIO`

One portfolio per teacher.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| teacher_id | uuid FK → USER | Must be teacher role — enforce in app |
| bio | string | Free text |
| avg_feedback_score | float | Denormalized average — must be refreshed when FEEDBACK rows change |
| updated_at | timestamp | — |

`avg_feedback_score` is a cached value. Either recompute on every FEEDBACK insert/delete via a trigger, or run a scheduled job and update `updated_at` accordingly.

---

## Doubt Clarification

**Feature:** Doubt Clarification  
**Tables:** `DOUBT`, `DOUBT_VOTE`

### DOUBT

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| raised_by | uuid FK → USER | Student who asked |
| assigned_teacher_id | uuid FK → USER | Teacher responsible for answering |
| session_id | uuid FK → SESSION | Session context (subject is derived from session → course) |
| topic | string | Short summary |
| type | string | `conceptual`, `numerical`, `exam-related`, etc. |
| content | string | Full doubt text |
| status | string | `open`, `answered`, `closed` |
| vote_count | int | Denormalized — keep in sync with DOUBT_VOTE rows |
| asked_at / resolved_at | timestamp | — |

**Note:** No separate `subject_id` on DOUBT. Subject is derived via `session → course → semester_subject`. Storing it independently risks the two going out of sync.

### DOUBT_VOTE

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| doubt_id | uuid FK → DOUBT | — |
| user_id | uuid FK → USER | Who upvoted |
| voted_at | timestamp | — |

**Constraint:** `UNIQUE(doubt_id, user_id)` — one vote per user per doubt.  
`DOUBT.vote_count` must be kept in sync — use a trigger or recount on read.

---

## Quiz

**Feature:** Quiz  
**Tables:** `QUIZ`, `QUIZ_QUESTION`, `QUIZ_QUESTION_POOL`, `QUIZ_ATTEMPT`, `QUIZ_RESPONSE`

### QUIZ

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| course_id | uuid FK → COURSE | — |
| subject_id | uuid FK → SEMESTER_SUBJECT | Narrows scope to a subject |
| title / topic | string | — |
| question_count | int | How many questions to draw per attempt |
| is_active | boolean | Inactive quizzes are hidden from students |
| created_at | timestamp | — |

### QUIZ_QUESTION
The global question bank. Questions are not tied to a single quiz.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| subject_id | uuid FK → SEMESTER_SUBJECT | Subject this question belongs to |
| topic | string | Sub-topic within the subject |
| question_text | string | — |
| options | json | Array of option strings: `["A", "B", "C", "D"]` |
| correct_answer | string | One of the option values |
| difficulty | string | `easy`, `medium`, `hard` |

### QUIZ_QUESTION_POOL
Join table — assigns questions to quizzes. Allows question reuse across quizzes.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| quiz_id | uuid FK → QUIZ | — |
| question_id | uuid FK → QUIZ_QUESTION | — |
| display_order | int | Order in which questions appear |

### QUIZ_ATTEMPT
One row per student per quiz attempt.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| quiz_id | uuid FK → QUIZ | — |
| student_id | uuid FK → USER | — |
| score | int | Final score |
| total_questions | int | Snapshot of question count at time of attempt |
| percentage | float | score / total_questions × 100 |
| question_order | json | Shuffled question IDs for this attempt (anti-cheating) |
| status | string | `in-progress`, `submitted`, `timed-out` |
| started_at / completed_at | timestamp | — |

### QUIZ_RESPONSE
One row per question per attempt.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| attempt_id | uuid FK → QUIZ_ATTEMPT | — |
| question_id | uuid FK → QUIZ_QUESTION | — |
| selected_answer | string | What the student chose |
| is_correct | boolean | Pre-computed at submission time |
| time_taken_seconds | int | Time spent on this question |

---

## LMS Integration

**Feature:** Integration of LMS  
**Tables:** `LMS_SYNC`

Sync log between external LMS (e.g. Moodle, Google Classroom) and TechnoBuzz.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| lms_provider | string | `moodle`, `google_classroom`, `canvas`, etc. |
| external_course_id | string | Course ID in the LMS |
| external_user_id | string | User ID in the LMS (for bidirectional mapping) |
| internal_course_id | uuid FK → COURSE | — |
| user_id | uuid FK → USER | — |
| sync_status | string | `pending`, `success`, `failed`, `conflict` — treat as enum |
| last_synced_at | timestamp | — |

---

## Attendance Prediction

**Feature:** Attendance Prediction  
**Tables:** `ATTENDANCE_PREDICTION`

ML-generated attendance risk scores per student per course.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| student_id | uuid FK → USER | — |
| course_id | uuid FK → COURSE | — |
| current_percentage | float | Actual attendance % at time of computation |
| predicted_percentage | float | Model's end-of-term prediction |
| risk_level | string | `low`, `medium`, `high`, `critical` |
| pattern_data | json | Raw attendance pattern used by the model |
| model_version | string | Which model version produced this row |
| computed_at | timestamp | — |

`model_version` lets you filter out stale predictions after a model retrain.

---

## Student Dashboard

**Feature:** Student Dashboard  
**Tables:** `STUDENT_DASHBOARD`, `WEAK_CONCEPT`

### STUDENT_DASHBOARD
Cached snapshot of a student's performance per course.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| student_id | uuid FK → USER | — |
| course_id | uuid FK → COURSE | — |
| attendance_percentage | float | Cached from ATTENDANCE |
| avg_quiz_score | float | Cached from QUIZ_ATTEMPT |
| marks_summary | string | JSON string of marks breakdown |
| refreshed_at | timestamp | Age indicator — show stale warning in UI if old |

This is a materialized snapshot. Do not store `weak_concepts` here as a string — use the `WEAK_CONCEPT` table instead.

### WEAK_CONCEPT
Per-topic accuracy tracking per student per subject.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| student_id | uuid FK → USER | — |
| subject_id | uuid FK → SEMESTER_SUBJECT | — |
| topic | string | e.g. "Dijkstra's Algorithm" |
| accuracy_rate | float | Correct / total attempts for this topic |
| attempts | int | Total times attempted |
| last_assessed_at | timestamp | — |

Populated by aggregating `QUIZ_RESPONSE.is_correct` grouped by `QUIZ_QUESTION.topic`.

---

## Teacher Insight Report

**Feature:** Teacher Insight Report  
**Tables:** `TEACHER_INSIGHT`

Generated report for a teacher covering one of their courses.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | — |
| teacher_id | uuid FK → USER | Must be teacher role |
| course_id | uuid FK → COURSE | — |
| class_avg_quiz_score | float | Average across all students |
| avg_feedback_rating | float | Average FEEDBACK.rating for this course |
| poor_feedback_entries | json | Array of low-rated feedback items |
| attendance_trend | string | e.g. `improving`, `declining`, `stable` |
| topic_weakness_map | json | Map of topic → class accuracy rate |
| generated_at | timestamp | — |

This is a snapshot like `STUDENT_DASHBOARD`. Show `generated_at` in the UI so teachers know how fresh the data is.

---

## Constraint Summary

| Table | Constraint | Type |
|---|---|---|
| RESOURCE | `num_nonnulls(unit_id, exam_section_id) = 1` | CHECK |
| ATTENDANCE | `UNIQUE(student_id, session_id)` | UNIQUE |
| DOUBT_VOTE | `UNIQUE(doubt_id, user_id)` | UNIQUE |
| QUIZ_QUESTION_POOL | `UNIQUE(quiz_id, question_id)` | UNIQUE |
| LMS_SYNC | `sync_status IN (pending, success, failed, conflict)` | CHECK |
| ROLE | `name IN (student, teacher, admin)` | CHECK |