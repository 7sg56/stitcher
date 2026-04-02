import { SupabaseClient } from "@supabase/supabase-js";
import { Enrollment, EnrollmentWithCourse } from "../../types/database";

export class EnrollmentService {
    constructor(private supabase: SupabaseClient) { }

    async enrollStudent(userId: string, courseId: string): Promise<Enrollment> {
        // Verify the course exists and is active
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

    async getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
        const { data, error } = await this.supabase
            .from("enrollments")
            .select("*")
            .eq("course_id", courseId)
            .eq("status", "active")
            .order("enrolled_at");

        if (error) throw error;
        return (data ?? []) as Enrollment[];
    }
}
