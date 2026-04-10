import AuthGate from "../../components/AuthGate";
import { Sidebar } from "../../components/layout/sidebar";

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
                    <div className="w-full">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
