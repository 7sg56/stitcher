erDiagram
  USER ||--o{ ALIAS : has
  USER ||--o{ VIOLATION : receives
  USER ||--o{ ATTENDANCE : has
  USER ||--o{ FEEDBACK : gives
  USER ||--o{ DOUBT : raises
  USER ||--o{ QUIZ_ATTEMPT : takes
  USER ||--o{ RESOURCE : uploads
  USER ||--o{ PORTFOLIO : owns

  ROLE ||--o{ USER : classifies

  COURSE ||--o{ ENROLLMENT : has
  COURSE ||--o{ SEMESTER_SUBJECT : contains
  COURSE ||--o{ SESSION : holds
  COURSE ||--o{ QUIZ : belongs_to

  ENROLLMENT }o--|| USER : links

  SEMESTER_SUBJECT ||--o{ UNIT : divided_into
  SEMESTER_SUBJECT ||--o{ EXAM_SECTION : has
  SEMESTER_SUBJECT ||--o{ DOUBT : tagged_to
  SEMESTER_SUBJECT ||--o{ QUIZ_QUESTION : tagged_to

  UNIT ||--o{ RESOURCE : stores
  EXAM_SECTION ||--o{ RESOURCE : stores_pyq

  SESSION ||--o{ ATTENDANCE : recorded_in
  SESSION ||--o{ FEEDBACK : collected_in
  SESSION ||--o{ DOUBT : raised_in

  DOUBT ||--o{ DOUBT_VOTE : receives
  USER ||--o{ DOUBT_VOTE : casts
  DOUBT }o--|| USER : assigned_to_teacher

  QUIZ ||--o{ QUIZ_QUESTION : draws_from
  QUIZ ||--o{ QUIZ_ATTEMPT : generates
  QUIZ_ATTEMPT ||--o{ QUIZ_RESPONSE : contains
  QUIZ_QUESTION ||--o{ QUIZ_RESPONSE : answered_by

  ATTENDANCE_PREDICTION ||--|| USER : predicts_for
  ATTENDANCE_PREDICTION }o--|| COURSE : covers

  TEACHER_INSIGHT }o--|| USER : for_teacher
  TEACHER_INSIGHT }o--|| COURSE : covers

  LMS_SYNC ||--o{ COURSE : maps
  LMS_SYNC ||--o{ USER : maps