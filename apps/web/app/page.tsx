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
    <div className="flex min-h-[200vh] flex-col bg-[#0d0d0d] text-white selection:bg-emerald-500/30 selection:text-white overflow-x-hidden relative">
      <header className="fixed top-0 left-0 right-0 h-20 items-center justify-between px-8 flex z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          >
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
          <span className="text-xl font-semibold tracking-tight text-white drop-shadow-md">Stitcher</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Log in
          </Link>
          <Button asChild variant="default" className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md rounded-xl">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-black/50" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center px-4 mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-medium text-zinc-300 tracking-wider uppercase">Stitcher 2.0 Access</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            className="text-5xl font-medium tracking-tight text-white sm:text-7xl drop-shadow-2xl"
          >
            The new structural paradigm
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
            className="mt-8 text-xl leading-relaxed text-zinc-400 max-w-3xl mx-auto font-light"
          >
            A high-end, intelligent platform built purely for focus. Encrypted identities, deeply integrated session analytics, and a cinematic interface built from the ground up for maximum visual clarity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="h-14 px-10 text-lg bg-white hover:bg-zinc-200 rounded-xl text-black font-medium tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all">
              <Link href="/dashboard">Access Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md text-white transition-all hover:text-white">
              <Link href="/sign-up">Create Identity</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Feature Glass Block */}
      <section className="relative z-20 -mt-32 max-w-7xl mx-auto px-6 w-full pb-32">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative backdrop-blur-[60px] bg-black/40 border-t border-white/10 rounded-[2rem] p-1 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden group"
        >
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="bg-black/10 border border-white/5 rounded-3xl p-12 w-full min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10 max-w-5xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <h3 className="text-xl font-medium text-white">Encrypted Aliases</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Generate cryptographically secure identities. Communicate and evaluate without revealing your underlying core data.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                </div>
                <h3 className="text-xl font-medium text-white">Aggregated Sessions</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Advanced metric aggregation via BullMQ queues parsing attendance, quizzes, and micro-engagements into a single flow.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </div>
                <h3 className="text-xl font-medium text-white">Structural Architecture</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Designed on the foundation of Next.js 15. Real-time updates via WebSockets and persistent memory mapping.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 border-t border-white/5 bg-[#0a0a0a] text-center relative z-20">
        <p className="text-sm text-zinc-600 font-light tracking-wide uppercase">© 2026 Stitcher Platform. Premium Execution.</p>
      </footer>
    </div>
  );
}
