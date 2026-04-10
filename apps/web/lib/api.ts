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

// ============================================
// Phase 3: Sessions
// ============================================

export async function startSession(token: string, data: {
    course_id: string; topic?: string; location?: string;
}) {
    return api.post("/sessions", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function listSessions(token: string, courseId: string) {
    return api.get(`/sessions/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getActiveSession(token: string, courseId: string) {
    return api.get(`/sessions/active/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function endSession(token: string, sessionId: string) {
    return api.patch(`/sessions/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function cancelSession(token: string, sessionId: string) {
    return api.patch(`/sessions/${sessionId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 3: Attendance
// ============================================

export async function markAttendance(token: string, data: {
    session_id: string; student_id: string; status: string;
}) {
    return api.post("/attendance/mark", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function bulkMarkAttendance(token: string, data: {
    session_id: string; records: { student_id: string; status: string }[];
}) {
    return api.post("/attendance/bulk", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getAttendanceBySession(token: string, sessionId: string) {
    return api.get(`/attendance/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getStudentAttendance(token: string, courseId: string) {
    return api.get(`/attendance/student/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 4: Resources
// ============================================

export async function createResource(token: string, data: Record<string, unknown>) {
    return api.post("/resources", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function listResourcesByCourse(token: string, courseId: string) {
    return api.get(`/resources/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function listResourcesByUnit(token: string, unitId: string) {
    return api.get(`/resources/unit/${unitId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function deleteResource(token: string, resourceId: string) {
    return api.delete(`/resources/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 4: Quizzes
// ============================================

export async function createQuiz(token: string, data: {
    course_id: string; unit_id?: string; title: string; description?: string; duration_mins?: number;
}) {
    return api.post("/quizzes", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function listQuizzes(token: string, courseId: string) {
    return api.get(`/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getQuiz(token: string, quizId: string) {
    return api.get(`/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function publishQuiz(token: string, quizId: string) {
    return api.patch(`/quizzes/${quizId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function deleteQuiz(token: string, quizId: string) {
    return api.delete(`/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function addQuizQuestion(token: string, quizId: string, data: Record<string, unknown>) {
    return api.post(`/quizzes/${quizId}/questions`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function startQuizAttempt(token: string, quizId: string) {
    return api.post(`/quizzes/${quizId}/attempt`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function submitQuizAttempt(token: string, attemptId: string, data: {
    responses: { question_id: string; selected_option_id?: string; text_answer?: string }[];
}) {
    return api.post(`/quizzes/attempt/${attemptId}/submit`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getMyQuizAttempt(token: string, quizId: string) {
    return api.get(`/quizzes/${quizId}/my-attempt`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 4: Doubts (Course Chat)
// ============================================

export async function createDoubtThread(token: string, data: {
    course_id: string; title: string;
}) {
    return api.post("/doubts/threads", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function listDoubtThreads(token: string, courseId: string) {
    return api.get(`/doubts/threads/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getDoubtThread(token: string, threadId: string) {
    return api.get(`/doubts/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function sendDoubtMessage(token: string, threadId: string, data: { content: string }) {
    return api.post(`/doubts/threads/${threadId}/messages`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function resolveDoubtThread(token: string, threadId: string) {
    return api.patch(`/doubts/threads/${threadId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 4: Feedback
// ============================================

export async function openFeedbackWindow(token: string, data: {
    session_id: string; unit_id?: string;
}) {
    return api.post("/feedback/window", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function closeFeedbackWindow(token: string, windowId: string) {
    return api.patch(`/feedback/window/${windowId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getFeedbackWindow(token: string, sessionId: string) {
    return api.get(`/feedback/window/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function submitFeedback(token: string, data: {
    session_id: string; rating: number; comment?: string; is_anonymous?: boolean;
}) {
    return api.post("/feedback", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getFeedbackBySession(token: string, sessionId: string) {
    return api.get(`/feedback/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function getCourseRating(token: string, courseId: string) {
    return api.get(`/feedback/rating/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ============================================
// Phase 6: Public Teacher Portfolio
// ============================================

export async function getPublicTeacherPortfolio(token: string, teacherId: string) {
    return api.get(`/dashboard/teacher/${teacherId}/public-portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function updateTeacherProfile(token: string, data: Record<string, unknown>) {
    return api.put("/dashboard/teacher/profile", data, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export default api;
