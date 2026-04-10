"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="h-6 w-6 text-primary"
          >
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
          <span className="text-xl font-medium tracking-tight">Stitcher</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Button asChild variant="default">
            <Link href="/sign-up">Start for free</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-5xl font-medium tracking-tight text-foreground sm:text-7xl">
            Where learning connects
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Stitcher organizes courses, engagements, and attendance in a beautifully simple, minimal interface. Built precisely with hard edges and natural calm.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base border-border">
              <Link href="/sign-up">Read the Docs</Link>
            </Button>
          </div>
        </motion.div>

        {/* Abstract minimalistic SVG decorative element below hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-24 max-w-5xl w-full border border-border bg-card p-4 shadow-sm"
        >
          <div className="aspect-video w-full bg-secondary overflow-hidden relative flex items-center justify-center">
            <svg width="400" height="400" viewBox="0 0 100 100" className="text-primary/20" stroke="currentColor" strokeWidth="0.5" fill="none">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                d="M10,50 L90,50 M50,10 L50,90 M20,20 L80,80 M20,80 L80,20 M10,30 L90,30 M10,70 L90,70 M30,10 L30,90 M70,10 L70,90"
              />
            </svg>
          </div>
        </motion.div>
      </main>

      <footer className="py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">© 2026 Stitcher. Minimal standard design.</p>
      </footer>
    </div>
  );
}
