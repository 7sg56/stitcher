import { SupabaseClient } from "@supabase/supabase-js";
import { Enrollment, EnrollmentWithCourse, EnrollmentWithStudent } from "../../types/database";

export class EnrollmentService {
    constructor(private supabase: SupabaseClient) { }

    // Student enrolls via passkey
    async enrollByPasskey(userId: string, passkey: string): Promise<Enrollment> {
        // Find course by passkey
        const { data: course, error: courseError } = await this.supabase
            .from("courses")
            .select("id, is_active, passkey")
            .eq("passkey", passkey.toUpperCase())
            .single();

        if (courseError || !course) {
            throw new Error("Invalid passkey");
        }

        if (!course.is_active) {
            throw new Error("This course is not active");
        }

        return this.doEnroll(userId, course.id);
    }

    // Direct enrollment (for teacher add or backwards compat)
    async enrollStudent(userId: string, courseId: string): Promise<Enrollment> {
        const { data: course, error: courseError } = await this.supabase
            .from("courses")
            .select("id, is_active")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            throw new Error("Course not found");
        }

        if (!course.is_active) {
            throw new Error("Cannot enroll in an inactive course");
        }

        return this.doEnroll(userId, courseId);
    }

    private async doEnroll(userId: string, courseId: string): Promise<Enrollment> {
        // Check for existing enrollment
        const { data: existing } = await this.supabase
            .from("enrollments")
            .select("*")
            .eq("user_id", userId)
            .eq("course_id", courseId)
            .single();

        if (existing) {
            if (existing.status === "active") {
                throw new Error("Already enrolled in this course");
            }
            // Re-activate a dropped enrollment
            const { data: updated, error } = await this.supabase
                .from("enrollments")
                .update({ status: "active", enrolled_at: new Date().toISOString() })
                .eq("id", existing.id)
                .select("*")
                .single();

            if (error) throw error;
            return updated as Enrollment;
        }

        const { data: enrollment, error } = await this.supabase
            .from("enrollments")
            .insert({
                user_id: userId,
                course_id: courseId,
                status: "active",
            })
            .select("*")
            .single();

        if (error) throw error;
        return enrollment as Enrollment;
    }

    // Student drops their own enrollment
    async dropEnrollment(enrollmentId: string, userId: string): Promise<Enrollment> {
        const { data: enrollment, error: fetchError } = await this.supabase
            .from("enrollments")
            .select("*")
            .eq("id", enrollmentId)
            .single();

        if (fetchError || !enrollment) {
            throw new Error("Enrollment not found");
        }

        if (enrollment.user_id !== userId) {
            throw new Error("You can only drop your own enrollments");
        }

        if (enrollment.status !== "active") {
            throw new Error("Enrollment is not active");
        }

        const { data: updated, error } = await this.supabase
            .from("enrollments")
            .update({ status: "dropped" })
            .eq("id", enrollmentId)
            .select("*")
            .single();

        if (error) throw error;
        return updated as Enrollment;
    }

    // Teacher removes a student (hard delete)
    async removeStudent(enrollmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("enrollments")
            .delete()
            .eq("id", enrollmentId);

        if (error) throw error;
    }

    // Student's own enrollments
    async getMyEnrollments(userId: string): Promise<EnrollmentWithCourse[]> {
        const { data, error } = await this.supabase
            .from("enrollments")
            .select("*, course:courses(*)")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("enrolled_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as unknown as EnrollmentWithCourse[];
    }

    // Teacher/admin view: enrolled students with names
    async getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithStudent[]> {
        const { data: enrollments, error } = await this.supabase
            .from("enrollments")
            .select("*")
            .eq("course_id", courseId)
            .eq("status", "active")
            .order("enrolled_at");

        if (error) throw error;

        const items = (enrollments ?? []) as Enrollment[];
        if (items.length === 0) return [];

        // Fetch user info + aliases
        const userIds = items.map((e) => e.user_id);
        const { data: users } = await this.supabase
            .from("users")
            .select("id, real_name")
            .in("id", userIds);

        const { data: aliases } = await this.supabase
            .from("aliases")
            .select("user_id, display_name")
            .in("user_id", userIds)
            .eq("is_active", true);

        const userMap = Object.fromEntries(
            (users ?? []).map((u: { id: string; real_name: string | null }) => [u.id, u.real_name])
        );
        const aliasMap = Object.fromEntries(
            (aliases ?? []).map((a: { user_id: string; display_name: string }) => [a.user_id, a.display_name])
        );

        return items.map((e) => ({
            ...e,
            student_name: userMap[e.user_id] ?? null,
            student_alias: aliasMap[e.user_id] ?? null,
        })) as EnrollmentWithStudent[];
    }
}
