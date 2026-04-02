import { SupabaseClient } from "@supabase/supabase-js";
import { SemesterSubject, Unit, ExamSection, SubjectWithDetails } from "../../types/database";
import { CreateSubjectInput, CreateUnitInput, CreateExamSectionInput } from "./subjects.schema";

export class SubjectsService {
    constructor(private supabase: SupabaseClient) { }

    // --- Subjects ---

    async createSubject(data: CreateSubjectInput): Promise<SemesterSubject> {
        const { data: subject, error } = await this.supabase
            .from("semester_subjects")
            .insert({
                course_id: data.course_id,
                name: data.name,
                code: data.code,
                unit_count: data.unit_count,
            })
            .select("*")
            .single();

        if (error) throw error;
        return subject as SemesterSubject;
    }

    async listSubjectsByCourse(courseId: string): Promise<SemesterSubject[]> {
        const { data, error } = await this.supabase
            .from("semester_subjects")
            .select("*")
            .eq("course_id", courseId)
            .order("code");

        if (error) throw error;
        return (data ?? []) as SemesterSubject[];
    }

    async getSubjectById(subjectId: string): Promise<SubjectWithDetails | null> {
        const { data: subject, error } = await this.supabase
            .from("semester_subjects")
            .select("*")
            .eq("id", subjectId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        // Fetch units and exam sections
        const { data: units } = await this.supabase
            .from("units")
            .select("*")
            .eq("subject_id", subjectId)
            .order("unit_number");

        const { data: examSections } = await this.supabase
            .from("exam_sections")
            .select("*")
            .eq("subject_id", subjectId)
            .order("year", { ascending: false });

        return {
            ...subject,
            units: units ?? [],
            exam_sections: examSections ?? [],
        } as SubjectWithDetails;
    }

    // --- Units ---

    async createUnit(subjectId: string, data: CreateUnitInput): Promise<Unit> {
        const { data: unit, error } = await this.supabase
            .from("units")
            .insert({
                subject_id: subjectId,
                unit_number: data.unit_number,
                title: data.title,
                description: data.description ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return unit as Unit;
    }

    async listUnitsBySubject(subjectId: string): Promise<Unit[]> {
        const { data, error } = await this.supabase
            .from("units")
            .select("*")
            .eq("subject_id", subjectId)
            .order("unit_number");

        if (error) throw error;
        return (data ?? []) as Unit[];
    }

    // --- Exam Sections ---

    async createExamSection(subjectId: string, data: CreateExamSectionInput): Promise<ExamSection> {
        const { data: section, error } = await this.supabase
            .from("exam_sections")
            .insert({
                subject_id: subjectId,
                type: data.type,
                year: data.year,
                exam_board: data.exam_board ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return section as ExamSection;
    }

    async listExamSectionsBySubject(subjectId: string): Promise<ExamSection[]> {
        const { data, error } = await this.supabase
            .from("exam_sections")
            .select("*")
            .eq("subject_id", subjectId)
            .order("year", { ascending: false });

        if (error) throw error;
        return (data ?? []) as ExamSection[];
    }
}
