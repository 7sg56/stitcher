import { SupabaseClient } from "@supabase/supabase-js";
import { Course, CourseWithSubjects } from "../../types/database";
import { CreateCourseInput, UpdateCourseInput } from "./courses.schema";

export class CoursesService {
    constructor(private supabase: SupabaseClient) { }

    async createCourse(data: CreateCourseInput): Promise<Course> {
        const { data: course, error } = await this.supabase
            .from("courses")
            .insert({
                name: data.name,
                code: data.code,
                semester_number: data.semester_number,
                department: data.department ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return course as Course;
    }

    async updateCourse(courseId: string, data: UpdateCourseInput): Promise<Course> {
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.semester_number !== undefined) updateData.semester_number = data.semester_number;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        const { data: course, error } = await this.supabase
            .from("courses")
            .update(updateData)
            .eq("id", courseId)
            .select("*")
            .single();

        if (error) throw error;
        return course as Course;
    }

    async getCourseById(courseId: string): Promise<CourseWithSubjects | null> {
        const { data: course, error } = await this.supabase
            .from("courses")
            .select("*")
            .eq("id", courseId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        // Fetch associated subjects
        const { data: subjects } = await this.supabase
            .from("semester_subjects")
            .select("*")
            .eq("course_id", courseId)
            .order("code");

        return {
            ...course,
            subjects: subjects ?? [],
        } as CourseWithSubjects;
    }

    async listCourses(activeOnly: boolean): Promise<Course[]> {
        let query = this.supabase
            .from("courses")
            .select("*")
            .order("semester_number")
            .order("name");

        if (activeOnly) {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Course[];
    }

    async toggleActive(courseId: string): Promise<Course> {
        // Get current state
        const { data: current, error: fetchError } = await this.supabase
            .from("courses")
            .select("is_active")
            .eq("id", courseId)
            .single();

        if (fetchError) throw fetchError;

        const { data: course, error } = await this.supabase
            .from("courses")
            .update({ is_active: !current.is_active })
            .eq("id", courseId)
            .select("*")
            .single();

        if (error) throw error;
        return course as Course;
    }
}
