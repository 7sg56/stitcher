// ============================================
// Database types for Supabase tables
// To auto-generate later: npx supabase gen types typescript --project-id <id> > database.ts
// ============================================

export type RoleName = "student" | "teacher" | "admin";
export type OnboardingStatus = "pending" | "complete";

export interface Role {
    id: string;
    name: RoleName;
}

export interface User {
    id: string;
    role_id: string;
    clerk_id: string;
    real_name: string | null;
    real_email: string | null;
    real_phone: string | null;
    is_shadow_banned: boolean;
    profanity_score: number;
    onboarding_status: OnboardingStatus;
    teacher_title: string | null;
    created_at: string;
}

export interface UserWithRole extends User {
    role: Role;
    alias?: Alias | null;
}

export interface Alias {
    id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    is_active: boolean;
}

export interface AliasPool {
    id: string;
    adjective: string;
    noun: string;
    is_used: boolean;
}

// Visibility-filtered profile returned by API
export interface UserProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: RoleName;
    real_name?: string | null;
    real_email?: string | null;
    real_phone?: string | null;
    is_shadow_banned?: boolean;
    onboarding_status: OnboardingStatus;
    created_at: string;
}

export interface Violation {
    id: string;
    user_id: string;
    type: string;
    severity: number;
    hours_deducted: number;
    content_ref: string | null;
    created_at: string;
}

export interface Course {
    id: string;
    name: string;
    code: string;
    semester_number: number;
    department: string | null;
    is_active: boolean;
    passkey: string;
    teacher_id: string | null;
    class_name: string | null;
    created_at: string;
}

export interface CourseWithTeacher extends Course {
    teacher_name: string | null;
    teacher_title: string | null;
}

export type EnrollmentStatus = "active" | "dropped" | "completed";

export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    status: EnrollmentStatus;
    enrolled_at: string;
}

export interface EnrollmentWithCourse extends Enrollment {
    course: Course;
}

export interface EnrollmentWithStudent extends Enrollment {
    student_name: string | null;
    student_alias: string | null;
}

export interface Unit {
    id: string;
    course_id: string;
    unit_number: number;
    title: string;
    description: string | null;
}

export interface ExamSection {
    id: string;
    course_id: string;
    type: string;
    date: string | null;
    description: string | null;
    exam_board: string | null;
}

export interface CourseWithDetails extends Course {
    units: Unit[];
    exam_sections: ExamSection[];
    teacher_name: string | null;
    teacher_title: string | null;
}

export interface Session {
    id: string;
    course_id: string;
    teacher_id: string;
    topic: string | null;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number;
    quiz_id: string | null;
    location: string | null;
    is_cancelled: boolean;
}

export interface Attendance {
    id: string;
    student_id: string;
    session_id: string;
    status: string;
    hours_deducted: number;
    source: string | null;
    marked_at: string;
}

export interface Feedback {
    id: string;
    student_id: string;
    session_id: string;
    rating: number;
    comment: string | null;
    is_anonymous: boolean;
    submitted_at: string;
}

export interface Doubt {
    id: string;
    raised_by: string;
    assigned_teacher_id: string | null;
    session_id: string | null;
    topic: string | null;
    type: string | null;
    content: string;
    status: string;
    vote_count: number;
    asked_at: string;
    resolved_at: string | null;
}

export interface DoubtVote {
    id: string;
    doubt_id: string;
    user_id: string;
    voted_at: string;
}

// ============================================
// Phase 3: Sessions & Attendance (extended)
// ============================================

export interface AttendanceWithStudent extends Attendance {
    student_name: string | null;
    student_alias: string | null;
}

export interface SessionWithDetails extends Session {
    attendance_count?: number;
    feedback_count?: number;
}

// ============================================
// Phase 4: Engagement & Content Features
// ============================================

export interface Resource {
    id: string;
    course_id: string;
    unit_id: string | null;
    exam_section_id: string | null;
    uploaded_by: string;
    title: string;
    description: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
}

export interface Quiz {
    id: string;
    course_id: string;
    unit_id: string | null;
    created_by: string;
    title: string;
    description: string | null;
    duration_mins: number | null;
    is_published: boolean;
    created_at: string;
}

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: string;
    points: number;
    order_index: number;
}

export interface QuizQuestionPool {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
}

export interface QuizQuestionWithOptions extends QuizQuestion {
    options: QuizQuestionPool[];
}

export interface QuizWithQuestions extends Quiz {
    questions: QuizQuestionWithOptions[];
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    started_at: string;
    submitted_at: string | null;
    score: number | null;
    max_score: number | null;
}

export interface QuizResponse {
    id: string;
    attempt_id: string;
    question_id: string;
    selected_option_id: string | null;
    text_answer: string | null;
    is_correct: boolean | null;
    points_awarded: number;
}

export interface FeedbackWindow {
    id: string;
    session_id: string;
    unit_id: string | null;
    opened_by: string;
    opened_at: string;
    closed_at: string | null;
    is_open: boolean;
}

export interface DoubtThread {
    id: string;
    course_id: string;
    created_by: string;
    title: string;
    is_resolved: boolean;
    upvote_count: number;
    user_has_upvoted?: boolean;
    created_at: string;
}

export interface DoubtMessage {
    id: string;
    thread_id: string;
    sender_id: string;
    content: string;
    upvote_count: number;
    user_has_upvoted?: boolean;
    sent_at: string;
}

export interface DoubtMessageWithSender extends DoubtMessage {
    sender_alias: string;
    sender_name: string | null;
    sender_role: string;
}

export interface DoubtThreadWithMessages extends DoubtThread {
    messages: DoubtMessageWithSender[];
}

// ============================================
// Phase 5: Moderation, Dashboards & Analytics
// ============================================

export interface TeacherRating {
    id: string;
    teacher_id: string;
    course_id: string;
    weighted_avg_rating: number;
    total_reviews: number;
    is_flagged: boolean;
    last_aggregated_at: string;
}

export interface SessionInsight {
    id: string;
    session_id: string;
    weak_concepts: { concept: string; source: string; detail?: string }[];
    quiz_accuracy_pct: number | null;
    avg_rating: number | null;
    total_feedback: number;
    aggregated_at: string;
}

export interface AggregationJob {
    id: string;
    session_id: string;
    status: "pending" | "processing" | "done" | "failed";
    queued_at: string;
    completed_at: string | null;
    error: string | null;
}

// ============================================
// Phase 6: Content Reporting & AI Moderation
// ============================================

export type ReportContentType = "thread" | "message";
export type ReportStatus = "pending" | "flagged" | "dismissed";

export interface Report {
    id: string;
    reporter_id: string;
    course_id: string;
    content_type: ReportContentType;
    content_id: string;
    content_text: string | null;
    reason: string | null;
    ai_classification: {
        isFlagged: boolean;
        category: string;
        confidence: number;
        reasoning: string;
    } | null;
    status: ReportStatus;
    created_at: string;
}

export interface ReportWithDetails extends Report {
    reporter_alias: string | null;
    offender_id: string | null;
    offender_alias: string | null;
}
