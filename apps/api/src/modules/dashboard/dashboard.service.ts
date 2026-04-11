import { SupabaseClient } from "@supabase/supabase-js";

export interface StudentCourseData {
    course_id: string;
    course_name: string;
    course_code: string;
    class_name: string | null;
    teacher_id: string | null;
    teacher_name: string | null;
    teacher_title: string | null;
    attendance_pct: number;
    present_count: number;
    total_sessions: number;
    violation_count: number;
}

export interface StudentDashboardResult {
    courses: StudentCourseData[];
    overall_attendance_pct: number;
    total_violations: number;
}

export interface TeacherCourseRating {
    course_id: string;
    course_name: string;
    course_code: string;
    weighted_avg_rating: number;
    total_reviews: number;
    is_flagged: boolean;
    last_aggregated_at: string;
}

export interface SessionInsightData {
    session_id: string;
    topic: string | null;
    started_at: string;
    weak_concepts: { concept: string; source: string; detail?: string }[];
    quiz_accuracy_pct: number | null;
    avg_rating: number | null;
    total_feedback: number;
}

export interface TeacherPortfolioResult {
    ratings: TeacherCourseRating[];
    overall_avg: number;
    total_reviews: number;
    is_any_flagged: boolean;
    recent_insights: SessionInsightData[];
    profile: {
        designation: string | null;
        contact_email: string | null;
        orcid_id: string | null;
        personal_website: string | null;
        mastery_tags: string[];
        bio: string | null;
    } | null;
}

export interface PublicTeacherPortfolioResult {
    profile: {
        id: string;
        real_name: string | null;
        real_email: string | null;
        teacher_title: string | null;
        designation: string | null;
        contact_email: string | null;
        orcid_id: string | null;
        personal_website: string | null;
        mastery_tags: string[];
        bio: string | null;
    };
    ratings: TeacherCourseRating[];
    overall_avg: number;
    total_reviews: number;
}

export class DashboardService {
    constructor(private supabase: SupabaseClient) { }

    // ---- Student Dashboard ----

    async getStudentDashboard(studentId: string): Promise<StudentDashboardResult> {
        // Get enrolled courses
        const { data: enrollments } = await this.supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", studentId)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
            return { courses: [], overall_attendance_pct: 0, total_violations: 0 };
        }

        const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

        // Get course details with teacher info
        const { data: courses } = await this.supabase
            .from("courses")
            .select("id, name, code, class_name, teacher_id")
            .in("id", courseIds);

        // Get teacher info
        const teacherIds = [...new Set((courses ?? [])
            .map((c: { teacher_id: string | null }) => c.teacher_id)
            .filter(Boolean))] as string[];

        let teacherMap: Record<string, { real_name: string | null; teacher_title: string | null }> = {};
        if (teacherIds.length > 0) {
            const { data: teachers } = await this.supabase
                .from("users")
                .select("id, real_name, teacher_title")
                .in("id", teacherIds);

            teacherMap = Object.fromEntries(
                (teachers ?? []).map((t: any) => [t.id, { real_name: t.real_name, teacher_title: t.teacher_title }])
            );
        }

        const results: StudentCourseData[] = [];
        let totalPresent = 0;
        let totalSessions = 0;
        let totalViolations = 0;

        for (const course of (courses ?? [])) {
            // Attendance
            const { data: sessions } = await this.supabase
                .from("sessions")
                .select("id")
                .eq("course_id", course.id)
                .eq("is_cancelled", false);

            const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
            const nonCancelledCount = sessionIds.length;

            let presentCount = 0;
            if (sessionIds.length > 0) {
                const { data: attendance } = await this.supabase
                    .from("attendance")
                    .select("status")
                    .eq("student_id", studentId)
                    .in("session_id", sessionIds);

                presentCount = (attendance ?? []).filter(
                    (a: { status: string }) => a.status === "present" || a.status === "late"
                ).length;
            }

            // Violations
            const { data: violations } = await this.supabase
                .from("violations")
                .select("id")
                .eq("user_id", studentId)
                .eq("course_id", course.id);

            const violationCount = violations?.length ?? 0;

            const teacher = course.teacher_id ? teacherMap[course.teacher_id] : null;
            const attendancePct = nonCancelledCount > 0
                ? Math.round((presentCount / nonCancelledCount) * 100)
                : 0;

            results.push({
                course_id: course.id,
                course_name: course.name,
                course_code: course.code,
                class_name: course.class_name,
                teacher_id: course.teacher_id,
                teacher_name: teacher?.real_name ?? null,
                teacher_title: teacher?.teacher_title ?? null,
                attendance_pct: attendancePct,
                present_count: presentCount,
                total_sessions: nonCancelledCount,
                violation_count: violationCount,
            });

            totalPresent += presentCount;
            totalSessions += nonCancelledCount;
            totalViolations += violationCount;
        }

        return {
            courses: results,
            overall_attendance_pct: totalSessions > 0
                ? Math.round((totalPresent / totalSessions) * 100)
                : 0,
            total_violations: totalViolations,
        };
    }

    // ---- Teacher Portfolio ----

    async getTeacherPortfolio(teacherId: string): Promise<TeacherPortfolioResult> {
        // Get ratings across all courses
        const { data: ratings } = await this.supabase
            .from("teacher_ratings")
            .select("*, courses:course_id(name, code)")
            .eq("teacher_id", teacherId)
            .order("last_aggregated_at", { ascending: false });

        const courseRatings: TeacherCourseRating[] = (ratings ?? []).map((r: any) => ({
            course_id: r.course_id,
            course_name: r.courses?.name ?? "Unknown",
            course_code: r.courses?.code ?? "",
            weighted_avg_rating: parseFloat(r.weighted_avg_rating),
            total_reviews: r.total_reviews,
            is_flagged: r.is_flagged,
            last_aggregated_at: r.last_aggregated_at,
        }));

        const totalReviews = courseRatings.reduce((sum, r) => sum + r.total_reviews, 0);
        const overallAvg = totalReviews > 0
            ? courseRatings.reduce((sum, r) => sum + r.weighted_avg_rating * r.total_reviews, 0) / totalReviews
            : 0;

        // Get recent session insights for teacher's sessions
        const { data: teacherSessions } = await this.supabase
            .from("sessions")
            .select("id, topic, started_at")
            .eq("teacher_id", teacherId)
            .order("started_at", { ascending: false })
            .limit(10);

        const recentInsights: SessionInsightData[] = [];

        // Fetch the teacher profile 
        const { data: profile } = await this.supabase
            .from("teacher_profiles")
            .select("*")
            .eq("teacher_id", teacherId)
            .maybeSingle();

        if (teacherSessions && teacherSessions.length > 0) {
            const sessionIds = teacherSessions.map((s: { id: string }) => s.id);

            const { data: insights } = await this.supabase
                .from("session_insights")
                .select("*")
                .in("session_id", sessionIds);

            for (const insight of (insights ?? [])) {
                const session = teacherSessions.find((s: any) => s.id === insight.session_id);
                recentInsights.push({
                    session_id: insight.session_id,
                    topic: session?.topic ?? null,
                    started_at: session?.started_at ?? insight.aggregated_at,
                    weak_concepts: insight.weak_concepts ?? [],
                    quiz_accuracy_pct: insight.quiz_accuracy_pct ? parseFloat(insight.quiz_accuracy_pct) : null,
                    avg_rating: insight.avg_rating ? parseFloat(insight.avg_rating) : null,
                    total_feedback: insight.total_feedback,
                });
            }
        }

        return {
            ratings: courseRatings,
            overall_avg: Math.round(overallAvg * 100) / 100,
            total_reviews: totalReviews,
            is_any_flagged: courseRatings.some(r => r.is_flagged),
            recent_insights: recentInsights,
            profile: profile ? {
                designation: profile.designation,
                contact_email: profile.contact_email,
                orcid_id: profile.orcid_id,
                personal_website: profile.personal_website,
                mastery_tags: profile.mastery_tags || [],
                bio: profile.bio
            } : null
        };
    }

    async updateTeacherProfile(teacherId: string, profileData: any) {
        const { data, error } = await this.supabase
            .from("teacher_profiles")
            .upsert({
                teacher_id: teacherId,
                designation: profileData.designation,
                contact_email: profileData.contact_email,
                orcid_id: profileData.orcid_id,
                personal_website: profileData.personal_website,
                mastery_tags: profileData.mastery_tags,
                bio: profileData.bio,
                updated_at: new Date().toISOString()
            }, { onConflict: "teacher_id" })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // ---- Public Teacher Portfolio (for students) ----

    async getPublicTeacherPortfolio(teacherId: string): Promise<PublicTeacherPortfolioResult | null> {
        // 1. Get user and profile details
        const { data: user } = await this.supabase
            .from("users")
            .select("id, real_name, real_email, teacher_title")
            .eq("id", teacherId)
            .single();

        if (!user) return null;

        const { data: profile } = await this.supabase
            .from("teacher_profiles")
            .select("*")
            .eq("teacher_id", teacherId)
            .maybeSingle();

        // 2. Get ratings
        const { data: ratings } = await this.supabase
            .from("teacher_ratings")
            .select("*, courses:course_id(name, code)")
            .eq("teacher_id", teacherId);

        const courseRatings: TeacherCourseRating[] = (ratings ?? []).map((r: any) => ({
            course_id: r.course_id,
            course_name: r.courses?.name ?? "Unknown",
            course_code: r.courses?.code ?? "",
            weighted_avg_rating: parseFloat(r.weighted_avg_rating),
            total_reviews: r.total_reviews,
            is_flagged: r.is_flagged, // This won't be exposed on the frontend anyway for public
            last_aggregated_at: r.last_aggregated_at,
        }));

        const totalReviews = courseRatings.reduce((sum, r) => sum + r.total_reviews, 0);
        const overallAvg = totalReviews > 0
            ? courseRatings.reduce((sum, r) => sum + r.weighted_avg_rating * r.total_reviews, 0) / totalReviews
            : 0;

        return {
            profile: {
                id: user.id,
                real_name: user.real_name,
                real_email: user.real_email,
                teacher_title: user.teacher_title,
                designation: profile?.designation ?? null,
                contact_email: profile?.contact_email ?? user.real_email ?? null,
                orcid_id: profile?.orcid_id ?? null,
                personal_website: profile?.personal_website ?? null,
                mastery_tags: profile?.mastery_tags ?? [],
                bio: profile?.bio ?? null,
            },
            ratings: courseRatings,
            overall_avg: Math.round(overallAvg * 100) / 100,
            total_reviews: totalReviews,
        };
    }

    // ---- Session Insights (individual) ----

    async getSessionInsights(sessionId: string): Promise<SessionInsightData | null> {
        const { data: insight } = await this.supabase
            .from("session_insights")
            .select("*")
            .eq("session_id", sessionId)
            .single();

        if (!insight) return null;

        const { data: session } = await this.supabase
            .from("sessions")
            .select("topic, started_at")
            .eq("id", sessionId)
            .single();

        return {
            session_id: insight.session_id,
            topic: session?.topic ?? null,
            started_at: session?.started_at ?? insight.aggregated_at,
            weak_concepts: insight.weak_concepts ?? [],
            quiz_accuracy_pct: insight.quiz_accuracy_pct ? parseFloat(insight.quiz_accuracy_pct) : null,
            avg_rating: insight.avg_rating ? parseFloat(insight.avg_rating) : null,
            total_feedback: insight.total_feedback,
        };
    }

    // ---- Teacher Ratings (admin view) ----

    async getTeacherRatings(teacherId: string): Promise<TeacherCourseRating[]> {
        const { data: ratings } = await this.supabase
            .from("teacher_ratings")
            .select("*, courses:course_id(name, code)")
            .eq("teacher_id", teacherId);

        return (ratings ?? []).map((r: any) => ({
            course_id: r.course_id,
            course_name: r.courses?.name ?? "Unknown",
            course_code: r.courses?.code ?? "",
            weighted_avg_rating: parseFloat(r.weighted_avg_rating),
            total_reviews: r.total_reviews,
            is_flagged: r.is_flagged,
            last_aggregated_at: r.last_aggregated_at,
        }));
    }

    // ---- Student Profile (for teachers/admins) ----

    async getStudentProfileForTeacher(studentId: string, courseId: string) {
        // 1. Get student alias
        const { data: alias } = await this.supabase
            .from("aliases")
            .select("display_name")
            .eq("user_id", studentId)
            .eq("is_active", true)
            .maybeSingle();

        // 2. Get enrollment info for this course
        const { data: enrollment } = await this.supabase
            .from("enrollments")
            .select("*, course:courses(name, code, class_name)")
            .eq("user_id", studentId)
            .eq("course_id", courseId)
            .eq("status", "active")
            .single();

        if (!enrollment) return null;

        // 3. Attendance for this course
        const { data: sessions } = await this.supabase
            .from("sessions")
            .select("id")
            .eq("course_id", courseId)
            .eq("is_cancelled", false);

        const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
        let presentCount = 0;

        if (sessionIds.length > 0) {
            const { data: attendance } = await this.supabase
                .from("attendance")
                .select("status")
                .eq("student_id", studentId)
                .in("session_id", sessionIds);

            presentCount = (attendance ?? []).filter(
                (a: { status: string }) => a.status === "present" || a.status === "late"
            ).length;
        }

        // 4. All enrolled courses (names only)
        const { data: allEnrollments } = await this.supabase
            .from("enrollments")
            .select("course:courses(name, code)")
            .eq("user_id", studentId)
            .eq("status", "active");

        // 5. Violation count for this course
        const { data: violations } = await this.supabase
            .from("violations")
            .select("id")
            .eq("user_id", studentId)
            .eq("course_id", courseId);

        const totalSessions = sessionIds.length;
        const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

        return {
            alias: alias?.display_name ?? "Anonymous",
            course: {
                name: (enrollment as any).course?.name ?? "",
                code: (enrollment as any).course?.code ?? "",
                class_name: (enrollment as any).course?.class_name ?? null,
            },
            attendance: {
                present: presentCount,
                total: totalSessions,
                percentage: attendancePct,
            },
            violation_count: violations?.length ?? 0,
            enrolled_courses: (allEnrollments ?? []).map((e: any) => ({
                name: e.course?.name ?? "",
                code: e.course?.code ?? "",
            })),
            enrolled_at: enrollment.enrolled_at,
        };
    }
}
