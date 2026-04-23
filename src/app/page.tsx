"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Film, Tv, Shield, Zap, Globe } from "lucide-react";
import { useSupabase } from "@/components/supabase-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();

  // Redirect logged-in users to profile selection
  useEffect(() => {
    if (!loading && user) {
      router.push("/profiles");
    }
  }, [user, loading, router]);

  // Show spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
      </div>
    );
  }

  // If logged in, don't render landing (redirecting)
  if (user) return null;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Nav */}
          <nav className="flex items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-amber-500">ARC</span> Cinematics
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400">
                Sign In
              </Link>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="flex flex-1 items-center px-6 md:px-[7vw]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl"
            >
              <h1 className="text-[clamp(40px,6vw,80px)] font-extrabold leading-[0.95] tracking-tight">
                Cinematic Streaming.<br />
                <span className="text-amber-500">Zero Compromise.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 md:text-lg">
                Your personal gateway to movies and TV shows. Real-Debrid powered, ad-free, and built for quality.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 hover:scale-105 active:scale-95"
                >
                  <Play size={16} fill="black" /> Get Started
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-20 md:px-[7vw]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">Built for True Cinephiles</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Film, title: "Movies & TV", desc: "Access the entire catalog. From blockbusters to hidden gems." },
              { icon: Zap, title: "Lightning Fast", desc: "Real-Debrid caching means instant playback. No buffering." },
              { icon: Shield, title: "Secure", desc: "Your debrid token, your rules. Server-side key management." },
              { icon: Globe, title: "Subtitles", desc: "Multi-language subtitle support baked right in." },
              { icon: Tv, title: "Resume Anywhere", desc: "Pick up exactly where you left off, on any device." },
              { icon: Play, title: "4K Ready", desc: "Quality selector up to 2160p. Your screen, your choice." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-zinc-900/60 p-6 ring-1 ring-white/5 transition hover:bg-zinc-900/80"
              >
                <f.icon size={24} className="mb-3 text-amber-500" />
                <h3 className="mb-1 text-sm font-semibold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-white/50">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 md:px-[7vw]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl rounded-2xl bg-zinc-900/80 p-10 text-center ring-1 ring-white/5"
        >
          <h2 className="text-2xl font-bold md:text-3xl">Ready to Watch?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
            Create your account and start streaming in under a minute.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/register"
              className="rounded bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              I Already Have One
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-white/30">
        <p>ARC Cinematics &mdash; Personal streaming powered by Real-Debrid.</p>
      </footer>
    </div>
  );
}
