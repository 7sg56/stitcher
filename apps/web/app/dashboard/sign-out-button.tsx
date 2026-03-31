"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
    const { signOut } = useClerk();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/sign-in");
    };

    return (
        <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
        >
            Sign out
        </button>
    );
}
