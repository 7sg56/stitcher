import { SupabaseClient } from "@supabase/supabase-js";
import { Course, CourseWithTeacher, CourseWithDetails, Unit, ExamSection } from "../../types/database";
import { CreateCourseInput, UpdateCourseInput } from "./courses.schema";

function generatePasskey(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 6; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

export class CoursesService {
    constructor(private supabase: SupabaseClient) { }

    async createCourse(data: CreateCourseInput, fallbackTeacherId?: string): Promise<Course> {
        const { data: course, error } = await this.supabase
            .from("courses")
            .insert({
                name: data.name,
                code: data.code,
                semester_number: data.semester_number,
                department: data.department ?? null,
                teacher_id: data.teacher_id ?? fallbackTeacherId ?? null,
                class_name: data.class_name ?? null,
                passkey: generatePasskey(),
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
        if (data.teacher_id !== undefined) updateData.teacher_id = data.teacher_id;
        if (data.class_name !== undefined) updateData.class_name = data.class_name;

        const { data: course, error } = await this.supabase
            .from("courses")
            .update(updateData)
            .eq("id", courseId)
            .select("*")
            .single();

        if (error) throw error;
        return course as Course;
    }

    async deleteCourse(courseId: string): Promise<void> {
        const { error } = await this.supabase
            .from("courses")
            .delete()
            .eq("id", courseId);
        if (error) throw error;
    }

    async getCourseById(courseId: string): Promise<CourseWithDetails | null> {
        const { data: course, error } = await this.supabase
            .from("courses")
            .select("*")
            .eq("id", courseId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        // Fetch teacher info
        let teacherName: string | null = null;
        let teacherTitle: string | null = null;
        if (course.teacher_id) {
            const { data: teacher } = await this.supabase
                .from("users")
                .select("real_name, teacher_title")
                .eq("id", course.teacher_id)
                .single();
            if (teacher) {
                teacherName = teacher.real_name;
                teacherTitle = teacher.teacher_title;
            }
        }

        // Fetch units and exam sections directly under course
        const { data: units } = await this.supabase
            .from("units")
            .select("*")
            .eq("course_id", courseId)
            .order("unit_number");

        const { data: examSections } = await this.supabase
            .from("exam_sections")
            .select("*")
            .eq("course_id", courseId)
            .order("year")
            .order("type");

        return {
            ...course,
            units: (units ?? []) as Unit[],
            exam_sections: (examSections ?? []) as ExamSection[],
            teacher_name: teacherName,
            teacher_title: teacherTitle,
        } as CourseWithDetails;
    }

    async listCourses(activeOnly: boolean): Promise<CourseWithTeacher[]> {
        const { data: courses, error } = await this.supabase
            .from("courses")
            .select("*")
            .order("semester_number")
            .order("name");

        if (error) throw error;

        let filtered = (courses ?? []) as Course[];
        if (activeOnly) {
            filtered = filtered.filter((c) => c.is_active);
        }

        // Batch-fetch teacher info
        const teacherIds = [...new Set(filtered.map((c) => c.teacher_id).filter(Boolean))] as string[];
        let teacherMap: Record<string, { real_name: string | null; teacher_title: string | null }> = {};

        if (teacherIds.length > 0) {
            const { data: teachers } = await this.supabase
                .from("users")
                .select("id, real_name, teacher_title")
                .in("id", teacherIds);

            if (teachers) {
                teacherMap = Object.fromEntries(
                    teachers.map((t: { id: string; real_name: string | null; teacher_title: string | null }) => [
                        t.id,
                        { real_name: t.real_name, teacher_title: t.teacher_title },
                    ])
                );
            }
        }

        return filtered.map((course) => ({
            ...course,
            teacher_name: course.teacher_id ? (teacherMap[course.teacher_id]?.real_name ?? null) : null,
            teacher_title: course.teacher_id ? (teacherMap[course.teacher_id]?.teacher_title ?? null) : null,
        })) as CourseWithTeacher[];
    }

    async toggleActive(courseId: string): Promise<Course> {
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

    async regeneratePasskey(courseId: string): Promise<Course> {
        const { data: course, error } = await this.supabase
            .from("courses")
            .update({ passkey: generatePasskey() })
            .eq("id", courseId)
            .select("*")
            .single();
        if (error) throw error;
        return course as Course;
    }

    // --- Units ---
    async addUnit(courseId: string, data: { unit_number: number; title: string; description?: string }): Promise<Unit> {
        const { data: unit, error } = await this.supabase
            .from("units")
            .insert({ course_id: courseId, ...data })
            .select("*")
            .single();
        if (error) throw error;
        return unit as Unit;
    }

    async deleteUnit(unitId: string): Promise<void> {
        const { error } = await this.supabase.from("units").delete().eq("id", unitId);
        if (error) throw error;
    }

    // --- Exam Sections ---
    async addExamSection(courseId: string, data: { type: string; year: number; exam_board?: string }): Promise<ExamSection> {
        const { data: section, error } = await this.supabase
            .from("exam_sections")
            .insert({ course_id: courseId, ...data })
            .select("*")
            .single();
        if (error) throw error;
        return section as ExamSection;
    }

    async deleteExamSection(sectionId: string): Promise<void> {
        const { error } = await this.supabase.from("exam_sections").delete().eq("id", sectionId);
        if (error) throw error;
    }
}
