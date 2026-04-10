import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 text-center">
                <h1 className="text-[8rem] font-bold flex items-center justify-center gap-2 text-foreground tracking-tighter leading-none mb-4">
                    <span className="text-primary">4</span>
                    <span>0</span>
                    <span>4</span>
                </h1>
                <h2 className="text-2xl font-medium text-foreground mb-4 tracking-tight">Page Not Found</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    The page you are looking for doesn&apos;t exist or has been moved.
                </p>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
