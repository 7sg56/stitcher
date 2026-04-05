import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 text-center">
                <h1 className="text-[8rem] font-bold flex items-center justify-center gap-2 text-white tracking-tighter leading-none mb-4">
                    <span className="text-indigo-500">4</span>
                    <span>0</span>
                    <span>4</span>
                </h1>
                <h2 className="text-2xl font-medium text-zinc-300 mb-4 tracking-tight">Page Not Found</h2>
                <p className="text-zinc-500 max-w-md mx-auto mb-8">
                    The page you are looking for doesn&apos;t exist or has been moved.
                </p>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
