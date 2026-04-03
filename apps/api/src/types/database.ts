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
    year: number;
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
