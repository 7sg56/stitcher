import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "./sign-out-button";
import TeacherPortfolio from "./TeacherPortfolio";

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

async function fetchStudentDashboard(token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
        const res = await fetch(`${apiUrl}/dashboard/student`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
}

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

            // Fetch enhanced dashboard data
            const dashData = await fetchStudentDashboard(token);
            const dashCourses = dashData?.dashboard?.courses || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statsPromises = enrolledCourses.map((e: any) => fetchAttendanceStats(token, e.course?.id || e.course_id));
            const stats = await Promise.all(statsPromises);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            enrolledCourses.forEach((e: any, idx: number) => {
                e.attendanceStats = stats[idx];
                totalTotalSessions += stats[idx].totalSessions;
                totalPresentCount += stats[idx].presentCount;

                // Merge dashboard data (teacher name, violation count)
                const courseId = e.course?.id || e.course_id;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dashCourse = dashCourses.find((dc: any) => dc.course_id === courseId);
                if (dashCourse) {
                    e.teacherName = dashCourse.teacher_name;
                    e.teacher_id = dashCourse.teacher_id;
                    e.className = dashCourse.class_name;
                    e.violationCount = dashCourse.violation_count;
                }
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
        <div className="space-y-8">
            <header className="flex items-center justify-between pb-6">
                <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-secondary px-3 py-1">
                        {roleName}
                    </span>
                    <SignOutButton />
                </div>
            </header>

            {/* Profile Card */}
            <div className="bg-card rounded-[1.5rem] p-8 lg:p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.02)] relative overflow-hidden">
                <h2 className="text-2xl font-serif text-foreground mb-6">Your Profile</h2>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            {user.imageUrl && (
                                <Image src={user.imageUrl} alt="Avatar" width={64} height={64}
                                    className="w-16 h-16 border border-border object-cover" />
                            )}
                            <div>
                                <p className="text-foreground font-medium text-lg">{displayName}</p>
                                {aliasName && roleName === "student" && (
                                    <p className="text-primary text-sm mt-0.5">Alias: {aliasName}</p>
                                )}
                                {teacherTitle && roleName === "teacher" && (
                                    <p className="text-primary text-sm mt-0.5">{teacherTitle}</p>
                                )}
                                <p className="text-muted-foreground text-sm mt-0.5">{user.emailAddresses[0]?.emailAddress}</p>
                            </div>
                        </div>

                        {roleName === "student" && totalTotalSessions > 0 && (
                            <div className="flex items-center gap-5 border-l border-border pl-5">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-foreground">Total Attendance</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{totalPresentCount} / {totalTotalSessions} sessions</p>
                                </div>
                                <div className="relative w-16 h-16 flex items-center justify-center bg-secondary">
                                    <svg className="w-full h-full transform -rotate-90 p-1" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-border" />
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={(2 * Math.PI * 40) * (1 - (totalPresentCount / totalTotalSessions))}
                                            strokeLinecap="square"
                                            className="text-primary transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-foreground">{Math.round((totalPresentCount / totalTotalSessions) * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-border">
                        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</dt>
                                <dd className="mt-1.5 text-sm text-foreground capitalize font-medium">{roleName}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</dt>
                                <dd className="mt-1.5 text-sm text-foreground font-medium">
                                    {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </dd>
                            </div>
                            {roleName === "teacher" && (
                                <div>
                                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courses</dt>
                                    <dd className="mt-1.5 text-sm text-foreground font-medium">{teacherCourses.length} course{teacherCourses.length !== 1 ? "s" : ""}</dd>
                                </div>
                            )}
                            {roleName === "student" && (
                                <div>
                                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</dt>
                                    <dd className="mt-1.5 text-sm text-foreground font-medium">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? "s" : ""}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>
            </div>

            {/* Student: Enrolled Courses */}
            {roleName === "student" && (
                <div className="bg-card rounded-[1.5rem] p-8 lg:p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.02)] relative overflow-hidden mt-8">
                    <div className="flex items-center justify-between mb-8 pb-4">
                        <h2 className="text-2xl font-serif text-foreground">My Courses</h2>
                        <Link href="/dashboard/courses" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                            Browse Courses &rarr;
                        </Link>
                    </div>
                    {enrolledCourses.length === 0 ? (
                        <p className="text-muted-foreground text-sm">You haven&apos;t enrolled in any courses yet. Ask your teacher for a course passkey.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {enrolledCourses.map((enrollment: any) => (
                                <div key={enrollment.id}
                                    className="relative flex flex-col sm:flex-row sm:items-center justify-between bg-muted rounded-2xl p-6 hover:bg-accent transition-all duration-300 group">

                                    <Link href={`/dashboard/courses/${enrollment.course?.id || enrollment.course_id}`} className="absolute inset-0 z-0" />

                                    <div className="relative z-10 pointer-events-none mb-4 sm:mb-0">
                                        <h3 className="text-foreground font-serif text-xl lg:text-2xl group-hover:text-primary transition-colors">{enrollment.course?.name || "Course"}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-500">
                                            <span className="font-mono bg-white/5 px-2 py-0.5 border border-white/10 rounded-md">{enrollment.course?.code}</span>
                                            {enrollment.className && <span className="font-medium text-zinc-300">{enrollment.className}</span>}
                                            <span className="flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white/10 mr-2 inline-block"></span>
                                                Semester {enrollment.course?.semester_number}
                                            </span>
                                            {enrollment.course?.department && (
                                                <span className="flex items-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/10 mr-2 inline-block"></span>
                                                    {enrollment.course.department}
                                                </span>
                                            )}
                                        </div>
                                        {enrollment.teacherName && (
                                            <div className="text-xs text-zinc-500 mt-4 pointer-events-auto flex items-center gap-2">
                                                <span className="uppercase tracking-widest text-[10px] font-semibold text-zinc-600">Faculty</span>
                                                {enrollment.teacher_id ? (
                                                    <Link
                                                        href={`/dashboard/teachers/${enrollment.teacher_id}`}
                                                        className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors relative z-20 shadow-sm"
                                                    >
                                                        {enrollment.teacherName}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium text-zinc-400">{enrollment.teacherName}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 relative z-10 pointer-events-auto">
                                        {enrollment.violationCount > 0 && (
                                            <span className="text-xs font-medium text-red-400 bg-red-950/30 border border-red-900/30 rounded-full px-3 py-1">
                                                {enrollment.violationCount} violation{enrollment.violationCount !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                        {enrollment.attendanceStats?.totalSessions > 0 && (
                                            <span className="font-mono text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 rounded-full px-4 py-1.5">
                                                {Math.round((enrollment.attendanceStats.presentCount / enrollment.attendanceStats.totalSessions) * 100)}% att.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Teacher: Course Management */}
            {(roleName === "teacher" || roleName === "admin") && (
                <div className="bg-card rounded-[1.5rem] p-8 lg:p-10 shadow-[0_32px_64px_-8px_rgba(218,226,253,0.02)] relative overflow-hidden mt-8">
                    <div className="flex items-center justify-between mb-8 pb-4">
                        <h2 className="text-2xl font-serif text-foreground">
                            {roleName === "teacher" ? "My Courses" : "Course Management"}
                        </h2>
                        <Link href="/dashboard/courses" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                            Manage Courses &rarr;
                        </Link>
                    </div>
                    {teacherCourses.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {roleName === "teacher" ? "You haven't created any courses yet." : "No courses created yet."}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {teacherCourses.map((course: any) => (
                                <Link key={course.id} href={`/dashboard/courses/${course.id}`}
                                    className="block bg-muted rounded-2xl p-6 hover:bg-accent transition-all duration-300 group">
                                    <div className="flex flex-col h-full justify-between gap-6">
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <h3 className="text-foreground font-serif text-xl leading-tight group-hover:text-primary transition-colors">{course.name}</h3>
                                                {course.passkey && (
                                                    <span className="font-mono text-[10px] text-zinc-400 bg-white/5 border border-white/10 rounded px-2 py-0.5 whitespace-nowrap">Key: {course.passkey}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-400">{course.code}</span>
                                                {!course.is_active && <span className="text-[10px] font-medium text-red-400 bg-red-950/30 border border-red-900/30 rounded px-2 py-0.5">Inactive</span>}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 mt-auto text-xs text-zinc-500">
                                                <span>Session {course.semester_number}</span>
                                                {course.department && (
                                                    <span className="flex items-center">
                                                        <span className="w-1 h-1 rounded-full bg-white/20 mx-2 inline-block"></span>
                                                        {course.department}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {course.teacher_name && roleName === "admin" && (
                                            <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs">
                                                <span className="uppercase tracking-widest text-[10px] font-semibold text-zinc-600">Instructor</span>
                                                <span className="font-medium text-zinc-300">{course.teacher_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Teacher Portfolio */}
            {(roleName === "teacher") && (
                <div className="mt-8">
                    <TeacherPortfolio />
                </div>
            )}
        </div>
    );
}
