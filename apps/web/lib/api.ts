import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    withCredentials: true,
});

/**
 * Sync the currently signed-in Clerk user to the Supabase database.
 * Call this after every successful sign-in or sign-up.
 */
export async function syncUser(token: string, data?: { real_name?: string; real_email?: string; real_phone?: string }) {
    return api.post("/auth/sync", data ?? {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get current user profile from the backend.
 */
export async function getMe(token: string) {
    return api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Complete onboarding -- submit real name + phone, receive alias.
 */
export async function onboardUser(token: string, data: { real_name: string; real_phone: string }) {
    return api.post("/auth/onboard", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get a user's visibility-filtered profile.
 */
export async function getUserProfile(token: string, userId: string) {
    return api.get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Admin: update a user's role.
 */
export async function updateUserRole(token: string, userId: string, role: string) {
    return api.patch(`/users/${userId}/role`, { role }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Admin: toggle shadow ban on a user.
 */
export async function toggleShadowBan(token: string, userId: string, isBanned: boolean) {
    return api.patch(`/users/${userId}/shadow-ban`, { is_shadow_banned: isBanned }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 2: Courses
// ============================================

export async function listCourses(token: string) {
    return api.get("/courses", {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getCourse(token: string, courseId: string) {
    return api.get(`/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function createCourse(token: string, data: {
    name: string; code: string; semester_number: number; department?: string;
}) {
    return api.post("/courses", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function updateCourse(token: string, courseId: string, data: Record<string, unknown>) {
    return api.patch(`/courses/${courseId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function toggleCourseActive(token: string, courseId: string) {
    return api.patch(`/courses/${courseId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 2: Subjects
// ============================================

export async function listSubjects(token: string, courseId: string) {
    return api.get(`/subjects/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getSubject(token: string, subjectId: string) {
    return api.get(`/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function createSubject(token: string, data: {
    course_id: string; name: string; code: string; unit_count?: number;
}) {
    return api.post("/subjects", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function createUnit(token: string, subjectId: string, data: {
    unit_number: number; title: string; description?: string;
}) {
    return api.post(`/subjects/${subjectId}/units`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function createExamSection(token: string, subjectId: string, data: {
    type: string; year: number; exam_board?: string;
}) {
    return api.post(`/subjects/${subjectId}/exam-sections`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 2: Enrollment
// ============================================

export async function enrollInCourse(token: string, courseId: string) {
    return api.post("/enrollment", { course_id: courseId }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function dropEnrollment(token: string, enrollmentId: string) {
    return api.delete(`/enrollment/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getMyEnrollments(token: string) {
    return api.get("/enrollment/my", {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getEnrollmentsByCourse(token: string, courseId: string) {
    return api.get(`/enrollment/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export default api;
