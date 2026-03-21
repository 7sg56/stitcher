erDiagram
  ROLE {
    uuid id PK
    string name
    string permissions
  }
  USER {
    uuid id PK
    uuid role_id FK
    string clerk_id
    string real_name
    string real_email
    string real_phone
    boolean is_shadow_banned
    int profanity_score
    timestamp created_at
  }
  ALIAS {
    uuid id PK
    uuid user_id FK
    string display_name
    string avatar_url
    boolean is_active
  }
  VIOLATION {
    uuid id PK
    uuid user_id FK
    string type
    int severity
    int hours_deducted
    string content_ref
    timestamp created_at
  }
  COURSE {
    uuid id PK
    string name
    string code
    int semester_number
    string department
    boolean is_active
  }
  ENROLLMENT {
    uuid id PK
    uuid user_id FK
    uuid course_id FK
    string status
    timestamp enrolled_at
  }
  PORTFOLIO {
    uuid id PK
    uuid teacher_id FK
    string bio
    float avg_feedback_score
    timestamp updated_at
  }
  ROLE ||--o{ USER : classifies
  USER ||--o{ ALIAS : has
  USER ||--o{ VIOLATION : receives
  USER ||--o{ ENROLLMENT : has
  USER ||--o{ PORTFOLIO : owns
  ENROLLMENT }o--|| COURSE : links

  COURSE {
    uuid id PK
    string name
    string code
    int semester_number
    string department
  }
  SEMESTER_SUBJECT {
    uuid id PK
    uuid course_id FK
    string name
    string code
    int unit_count
  }
  UNIT {
    uuid id PK
    uuid subject_id FK
    int unit_number
    string title
    string description
  }
  EXAM_SECTION {
    uuid id PK
    uuid subject_id FK
    string type
    int year
    string exam_board
  }
  RESOURCE {
    uuid id PK
    uuid uploaded_by FK
    uuid unit_id FK
    uuid exam_section_id FK
    string title
    string file_url
    string file_type
    string resource_category
    int download_count
    timestamp uploaded_at
  }
  SESSION {
    uuid id PK
    uuid course_id FK
    uuid teacher_id FK
    string topic
    timestamp started_at
    timestamp ended_at
    string location
  }
  LMS_SYNC {
    uuid id PK
    string lms_provider
    string external_course_id
    uuid internal_course_id FK
    uuid user_id FK
    string sync_status
    timestamp last_synced_at
  }
  COURSE ||--o{ SEMESTER_SUBJECT : contains
  COURSE ||--o{ SESSION : holds
  COURSE ||--o{ LMS_SYNC : mapped_in
  SEMESTER_SUBJECT ||--o{ UNIT : divided_into
  SEMESTER_SUBJECT ||--o{ EXAM_SECTION : has
  UNIT ||--o{ RESOURCE : stores_notes
  EXAM_SECTION ||--o{ RESOURCE : stores_pyq

  SESSION {
    uuid id PK
    uuid course_id FK
    uuid teacher_id FK
    string topic
    timestamp started_at
    timestamp ended_at
  }
  ATTENDANCE {
    uuid id PK
    uuid student_id FK
    uuid session_id FK
    string status
    int hours_deducted
    string source
    timestamp marked_at
  }
  FEEDBACK {
    uuid id PK
    uuid student_id FK
    uuid session_id FK
    int rating
    string comment
    boolean is_anonymous
    timestamp submitted_at
  }
  DOUBT {
    uuid id PK
    uuid raised_by FK
    uuid assigned_teacher_id FK
    uuid session_id FK
    uuid subject_id FK
    string topic
    string type
    string content
    string status
    int vote_count
    timestamp asked_at
    timestamp resolved_at
  }
  DOUBT_VOTE {
    uuid id PK
    uuid doubt_id FK
    uuid user_id FK
    timestamp voted_at
  }
  QUIZ {
    uuid id PK
    uuid course_id FK
    uuid subject_id FK
    string title
    string topic
    int question_count
    boolean is_active
    timestamp created_at
  }
  QUIZ_QUESTION {
    uuid id PK
    uuid quiz_id FK
    uuid subject_id FK
    string topic
    string question_text
    string options
    string correct_answer
    string difficulty
  }
  QUIZ_ATTEMPT {
    uuid id PK
    uuid quiz_id FK
    uuid student_id FK
    int score
    int total_questions
    float percentage
    timestamp started_at
    timestamp completed_at
  }
  QUIZ_RESPONSE {
    uuid id PK
    uuid attempt_id FK
    uuid question_id FK
    string selected_answer
    boolean is_correct
    int time_taken_seconds
  }
  SESSION ||--o{ ATTENDANCE : recorded_in
  SESSION ||--o{ FEEDBACK : collected_in
  SESSION ||--o{ DOUBT : raised_in
  DOUBT ||--o{ DOUBT_VOTE : receives
  QUIZ ||--o{ QUIZ_QUESTION : draws_from
  QUIZ ||--o{ QUIZ_ATTEMPT : generates
  QUIZ_ATTEMPT ||--o{ QUIZ_RESPONSE : contains
  QUIZ_QUESTION ||--o{ QUIZ_RESPONSE : answered_by
  
  USER {
    uuid id PK
    string real_name
  }
  COURSE {
    uuid id PK
    string name
  }
  ATTENDANCE_PREDICTION {
    uuid id PK
    uuid student_id FK
    uuid course_id FK
    float current_percentage
    float predicted_percentage
    string risk_level
    string pattern_data
    timestamp computed_at
  }
  STUDENT_DASHBOARD {
    uuid id PK
    uuid student_id FK
    uuid course_id FK
    float attendance_percentage
    float avg_quiz_score
    string weak_concepts
    string marks_summary
    timestamp refreshed_at
  }
  TEACHER_INSIGHT {
    uuid id PK
    uuid teacher_id FK
    uuid course_id FK
    float class_avg_quiz_score
    float avg_feedback_rating
    string poor_feedback_entries
    string attendance_trend
    string topic_weakness_map
    timestamp generated_at
  }
  WEAK_CONCEPT {
    uuid id PK
    uuid student_id FK
    uuid subject_id FK
    string topic
    float accuracy_rate
    int attempts
    timestamp last_assessed_at
  }
  USER ||--o{ ATTENDANCE_PREDICTION : has
  USER ||--o{ STUDENT_DASHBOARD : has
  USER ||--o{ TEACHER_INSIGHT : generates
  USER ||--o{ WEAK_CONCEPT : has
  COURSE ||--o{ ATTENDANCE_PREDICTION : covers
  COURSE ||--o{ STUDENT_DASHBOARD : scoped_to
  COURSE ||--o{ TEACHER_INSIGHT : covers