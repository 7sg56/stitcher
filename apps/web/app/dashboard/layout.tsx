import AuthGate from "../../components/AuthGate";
import { Sidebar } from "../../components/layout/sidebar";
import { Topbar } from "../../components/layout/topbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGate>
            <div className="flex min-h-screen w-full bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 bg-background sm:pl-60">
                    <Topbar />

                    <div className="p-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
