import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

async function syncUserToDb(token: string, userData: { real_name?: string; real_email?: string }) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        await fetch(`${apiUrl}/auth/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(userData),
        });
    } catch (error) {
        console.error("Failed to sync user to DB:", error);
    }
}

async function fetchMe(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) return await res.json();
    } catch (error) {
        console.error("Failed to fetch user:", error);
    }
    return null;
}

async function fetchMyEnrollments(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/enrollment/my`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
}

async function fetchCourses(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAttendanceStats(token: string, courseId: string): Promise<{ totalSessions: number; presentCount: number }> {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const [attRes, sessRes] = await Promise.all([
            fetch(`${apiUrl}/attendance/student/${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${apiUrl}/sessions/course/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        let records = [];
        let sessions = [];
        
        if (attRes.ok) {
            const data = await attRes.json();
            records = data.attendance || [];
        }
        if (sessRes.ok) {
            const data = await sessRes.json();
            sessions = data.sessions || [];
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nonCancelledSessions = sessions.filter((s: any) => !s.is_cancelled);
        
        let presentCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records.forEach((r: any) => {
            if (r.status === 'present' || r.status === 'late') {
                presentCount++;
            }
        });
        
        return {
            totalSessions: nonCancelledSessions.length,
            presentCount: presentCount
        };
    } catch {
        return { totalSessions: 0, presentCount: 0 };
    }
}

export default async function DashboardPage() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (token) {
        await syncUserToDb(token, {
            real_name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
            real_email: user.emailAddresses[0]?.emailAddress || undefined,
        });

        const meData = await fetchMe(token);
        if (meData?.user?.onboarding_status === "pending") {
            redirect("/onboard");
        }
    }

    // Get user data
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    let roleName = "student";
    let aliasName: string | null = null;
    let teacherTitle: string | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let enrolledCourses: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let teacherCourses: any[] = [];
    let myUserId: string | null = null;
    let totalTotalSessions = 0;
    let totalPresentCount = 0;

    if (token) {
        const meData = await fetchMe(token);
        if (meData?.user) {
            roleName = meData.user.role?.name || "student";
            myUserId = meData.user.id;
            teacherTitle = meData.user.teacher_title || null;
            if (meData.user.alias?.display_name) {
                aliasName = meData.user.alias.display_name;
            }
        }

        if (roleName === "student") {
            const enrollData = await fetchMyEnrollments(token);
            enrolledCourses = enrollData?.enrollments || [];

            const statsPromises = enrolledCourses.map((e: any) => fetchAttendanceStats(token, e.course?.id || e.course_id));
            const stats = await Promise.all(statsPromises);
            
            enrolledCourses.forEach((e: any, idx: number) => {
                e.attendanceStats = stats[idx];
                totalTotalSessions += stats[idx].totalSessions;
                totalPresentCount += stats[idx].presentCount;
            });
        }

        if (roleName === "teacher" || roleName === "admin") {
            const coursesData = await fetchCourses(token);
            const allCourses = coursesData?.courses || [];
            if (roleName === "teacher" && myUserId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                teacherCourses = allCourses.filter((c: any) => c.teacher_id === myUserId);
            } else {
                teacherCourses = allCourses;
            }
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white tracking-tight">Stitcher</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-800 px-2.5 py-1 rounded-full">
                            {roleName}
                        </span>
                        <SignOutButton />
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">
                {/* Profile Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Your Profile</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {user.imageUrl && (
                                    <Image src={user.imageUrl} alt="Avatar" width={64} height={64}
                                        className="w-16 h-16 rounded-full border-2 border-zinc-700" />
                                )}
                                <div>
                                    <p className="text-white font-medium text-lg">{displayName}</p>
                                    {aliasName && roleName === "student" && (
                                        <p className="text-indigo-400 text-sm">Alias: {aliasName}</p>
                                    )}
                                    {teacherTitle && roleName === "teacher" && (
                                        <p className="text-indigo-400 text-sm">{teacherTitle}</p>
                                    )}
                                    <p className="text-zinc-400 text-sm">{user.emailAddresses[0]?.emailAddress}</p>
                                </div>
                            </div>

                            {roleName === "student" && totalTotalSessions > 0 && (
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-white">Total Attendance</p>
                                        <p className="text-xs text-zinc-400">{totalPresentCount} / {totalTotalSessions} sessions</p>
                                    </div>
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-800" />
                                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                strokeDasharray={2 * Math.PI * 40}
                                                strokeDashoffset={(2 * Math.PI * 40) * (1 - (totalPresentCount / totalTotalSessions))}
                                                strokeLinecap="round"
                                                className="text-indigo-500 transition-all duration-1000 ease-out" 
                                            />
                                        </svg>
                                        <div className="absolute flex items-center justify-center">
                                            <span className="text-sm font-bold text-white">{Math.round((totalPresentCount / totalTotalSessions) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</dt>
                                    <dd className="mt-1 text-sm text-zinc-300 capitalize">{roleName}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Joined</dt>
                                    <dd className="mt-1 text-sm text-zinc-300">
                                        {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                    </dd>
                                </div>
                                {roleName === "teacher" && (
                                    <div>
                                        <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Courses</dt>
                                        <dd className="mt-1 text-sm text-zinc-300">{teacherCourses.length} course{teacherCourses.length !== 1 ? "s" : ""}</dd>
                                    </div>
                                )}
                                {roleName === "student" && (
                                    <div>
                                        <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Enrolled</dt>
                                        <dd className="mt-1 text-sm text-zinc-300">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? "s" : ""}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Student: Enrolled Courses */}
                {roleName === "student" && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">My Courses</h2>
                            <Link href="/dashboard/courses" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                Browse Courses &rarr;
                            </Link>
                        </div>
                        {enrolledCourses.length === 0 ? (
                            <p className="text-zinc-400 text-sm">You haven&apos;t enrolled in any courses yet. Ask your teacher for a course passkey.</p>
                        ) : (
                            <div className="space-y-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {enrolledCourses.map((enrollment: any) => (
                                    <Link key={enrollment.id} href={`/dashboard/courses/${enrollment.course?.id || enrollment.course_id}`}
                                        className="block bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-white font-medium">{enrollment.course?.name || "Course"}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                                    <span className="font-mono">{enrollment.course?.code}</span>
                                                    <span>Semester {enrollment.course?.semester_number}</span>
                                                    {enrollment.course?.department && <span>{enrollment.course.department}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">Enrolled</span>
                                                {enrollment.attendanceStats?.totalSessions > 0 && (
                                                    <span className="font-mono text-xs text-indigo-400 bg-zinc-800 px-2 py-1 rounded">
                                                        {Math.round((enrollment.attendanceStats.presentCount / enrollment.attendanceStats.totalSessions) * 100)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Teacher: Course Portfolio */}
                {(roleName === "teacher" || roleName === "admin") && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                {roleName === "teacher" ? "My Courses" : "Course Management"}
                            </h2>
                            <Link href="/dashboard/courses" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                Manage Courses &rarr;
                            </Link>
                        </div>
                        {teacherCourses.length === 0 ? (
                            <p className="text-zinc-400 text-sm">
                                {roleName === "teacher" ? "You haven't created any courses yet." : "No courses created yet."}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {teacherCourses.map((course: any) => (
                                    <Link key={course.id} href={`/dashboard/courses/${course.id}`}
                                        className="block bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-white font-medium">{course.name}</h3>
                                                    <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{course.code}</span>
                                                    {!course.is_active && <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Inactive</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                                    <span>Semester {course.semester_number}</span>
                                                    {course.department && <span>{course.department}</span>}
                                                    {course.teacher_name && roleName === "admin" && (
                                                        <span>Teacher: {course.teacher_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {course.passkey && (
                                                <span className="font-mono text-xs text-indigo-400 bg-zinc-800 px-2 py-1 rounded">{course.passkey}</span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
