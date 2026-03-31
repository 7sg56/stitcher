erDiagram
  ROLE ||--o{ USER : classifies
  USER ||--o{ ALIAS : has
  USER ||--o{ VIOLATION : receives
  USER ||--o{ ENROLLMENT : has
  USER ||--o{ PORTFOLIO : owns
  ENROLLMENT }o--|| COURSE : links

  COURSE ||--o{ SEMESTER_SUBJECT : contains
  COURSE ||--o{ SESSION : holds
  COURSE ||--o{ LMS_SYNC : mapped_in

  SEMESTER_SUBJECT ||--o{ UNIT : divided_into
  SEMESTER_SUBJECT ||--o{ EXAM_SECTION : has
  SEMESTER_SUBJECT ||--o{ QUIZ : scopes
  SEMESTER_SUBJECT ||--o{ QUIZ_QUESTION : tagged_to
  SEMESTER_SUBJECT ||--o{ WEAK_CONCEPT : tracked_in

  UNIT ||--o{ RESOURCE : stores_notes
  EXAM_SECTION ||--o{ RESOURCE : stores_pyq

  SESSION ||--o{ ATTENDANCE : recorded_in
  SESSION ||--o{ FEEDBACK : collected_in
  SESSION ||--o{ DOUBT : raised_in

  DOUBT ||--o{ DOUBT_VOTE : receives
  USER ||--o{ DOUBT_VOTE : casts
  DOUBT }o--|| USER : assigned_to

  QUIZ ||--o{ QUIZ_QUESTION_POOL : has
  QUIZ_QUESTION ||--o{ QUIZ_QUESTION_POOL : included_in
  QUIZ ||--o{ QUIZ_ATTEMPT : generates
  QUIZ_ATTEMPT ||--o{ QUIZ_RESPONSE : contains
  QUIZ_QUESTION ||--o{ QUIZ_RESPONSE : answered_by

  USER ||--o{ ATTENDANCE_PREDICTION : has
  USER ||--o{ STUDENT_DASHBOARD : has
  USER ||--o{ WEAK_CONCEPT : has
  USER ||--o{ TEACHER_INSIGHT : generates

  COURSE ||--o{ ATTENDANCE_PREDICTION : covers
  COURSE ||--o{ STUDENT_DASHBOARD : scoped_to
  COURSE ||--o{ TEACHER_INSIGHT : covers
