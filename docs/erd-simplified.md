erDiagram
  ROLE ||--o{ USER : classifies
  USER ||--o{ ALIAS : has
  USER ||--o{ VIOLATION : receives
  USER ||--o{ ENROLLMENT : has
  USER ||--o{ PORTFOLIO : owns
  ENROLLMENT }o--|| COURSE : links

  COURSE ||--o{ SESSION : holds
  COURSE ||--o{ LMS_SYNC : mapped_in
  COURSE ||--o{ UNIT : divided_into
  COURSE ||--o{ EXAM_SECTION : has
  COURSE ||--o{ QUIZ : scopes
  COURSE ||--o{ QUIZ_QUESTION : tagged_to
  COURSE ||--o{ WEAK_CONCEPT : tracked_in

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
