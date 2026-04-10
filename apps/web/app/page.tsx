"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRef } from "react";

export default function Home() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="flex min-h-[200vh] flex-col bg-background text-foreground selection:bg-primary/30 selection:text-foreground overflow-x-hidden relative">
      <header className="fixed top-0 left-0 right-0 h-20 items-center justify-between px-8 flex z-50 bg-gradient-to-b from-background/90 to-transparent backdrop-blur-sm">
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
          <span className="text-2xl font-serif tracking-tight text-foreground drop-shadow-md">Stitcher</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Button asChild variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-xl font-medium tracking-wide shadow-md">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={ref} className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 w-full h-[120%] -top-[10%]">
          <Image
            src="/home-hero.png"
            alt="Stitcher Hero Background"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center px-4 mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Stitcher 2.0 Access</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            className="text-5xl font-serif tracking-tight text-foreground sm:text-7xl drop-shadow-lg"
          >
            The New Structural Paradigm
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
            className="mt-8 text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto font-light"
          >
            A high-end, intelligent platform built purely for focus. Encrypted identities, deeply integrated session analytics, and a cinematic interface built from the ground up to empower intellectual depth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 rounded-[0.75rem] text-primary-foreground font-medium tracking-wide shadow-[0_12px_24px_-4px_rgba(187,195,255,0.2)] transition-all">
              <Link href="/dashboard">Access Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg bg-muted hover:bg-accent border-none rounded-[0.75rem] text-foreground transition-all shadow-sm">
              <Link href="/sign-up">Create Identity</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Feature Block */}
      <section className="relative z-20 -mt-32 max-w-7xl mx-auto px-6 w-full pb-32">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-card rounded-[2rem] p-1 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] overflow-hidden group"
        >
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          <div className="bg-card rounded-3xl p-12 w-full min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10 max-w-5xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <h3 className="text-2xl font-serif text-foreground">Encrypted Aliases</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">Generate cryptographically secure identities. Communicate and evaluate without revealing your underlying core data.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                </div>
                <h3 className="text-2xl font-serif text-foreground">Aggregated Sessions</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">Advanced metric aggregation via BullMQ queues parsing attendance, quizzes, and micro-engagements into a single flow.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </div>
                <h3 className="text-2xl font-serif text-foreground">Structural Architecture</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">Designed on the foundation of Next.js 15. Real-time updates via WebSockets and persistent memory mapping.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 bg-muted text-center relative z-20">
        <p className="text-sm text-muted-foreground font-light tracking-widest uppercase">© 2026 Stitcher Platform. Digital Atelier.</p>
      </footer>
    </div>
  );
}
