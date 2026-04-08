import { SupabaseClient } from "@supabase/supabase-js";
import { Resource } from "../../types/database";
import { CreateResourceInput } from "./resources.schema";

export class ResourcesService {
    constructor(private supabase: SupabaseClient) { }

    async createResource(uploadedBy: string, data: CreateResourceInput): Promise<Resource> {
        const { data: resource, error } = await this.supabase
            .from("resources")
            .insert({
                course_id: data.course_id,
                unit_id: data.unit_id ?? null,
                exam_section_id: data.exam_section_id ?? null,
                uploaded_by: uploadedBy,
                title: data.title,
                description: data.description ?? null,
                file_url: data.file_url,
                file_name: data.file_name,
                file_size: data.file_size ?? null,
                mime_type: data.mime_type ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return resource as Resource;
    }

    async listByCourse(courseId: string): Promise<Resource[]> {
        const { data, error } = await this.supabase
            .from("resources")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as Resource[];
    }

    async listByUnit(unitId: string): Promise<Resource[]> {
        const { data, error } = await this.supabase
            .from("resources")
            .select("*")
            .eq("unit_id", unitId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as Resource[];
    }

    async listByExamSection(examSectionId: string): Promise<Resource[]> {
        const { data, error } = await this.supabase
            .from("resources")
            .select("*")
            .eq("exam_section_id", examSectionId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as Resource[];
    }

    async deleteResource(resourceId: string): Promise<void> {
        const { error } = await this.supabase
            .from("resources")
            .delete()
            .eq("id", resourceId);
        if (error) throw error;
    }

    async getById(resourceId: string): Promise<Resource | null> {
        const { data, error } = await this.supabase
            .from("resources")
            .select("*")
            .eq("id", resourceId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;
        return data as Resource;
    }
}
