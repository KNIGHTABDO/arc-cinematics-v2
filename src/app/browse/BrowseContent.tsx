"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { Navbar } from "@/components/layout/Navbar";
import { ContentRow } from "@/components/rows/ContentRow";
import ContinueWatchingRow from "@/components/rows/ContinueWatchingRow";
import MyListRow from "@/components/rows/MyListRow";
import { useProfileHistory } from "@/lib/hooks/useProfileHistory";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { Play, Info } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

function SkeletonRow() {
  return (
    <div className="mb-8 px-[4vw]">
      <div className="mb-3 h-4 w-32 rounded bg-white/10 animate-pulse" />
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 rounded-xl bg-white/5 animate-pulse" style={{ width: "clamp(140px, 16vw, 200px)", aspectRatio: "2/3" }} />
        ))}
      </div>
    </div>
  );
}

export default function BrowseContent() {
  const { user, loading, activeProfile } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterType = searchParams.get("type");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    else if (!loading && user && !activeProfile) router.push("/profiles");
  }, [user, loading, activeProfile, router]);

  const { history, loading: historyLoading } = useProfileHistory(activeProfile?.id);
  const { lists, items } = useProfileLists(activeProfile?.id);

  const [hero, setHero] = useState<any>(null);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lang = "en-US";
    Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json()),
    ]).then(([trendM, popM, topM, trendTV, popTV]) => {
      const tm = trendM.results?.slice(0, 12) || [];
      setTrendingMovies(tm);
      setPopularMovies(popM.results?.slice(0, 12) || []);
      setTopRatedMovies(topM.results?.slice(0, 12) || []);
      setTrendingTV(trendTV.results?.slice(0, 12) || []);
      setPopularTV(popTV.results?.slice(0, 12) || []);
      setHero(tm[0] || null);
      setLoaded(true);
    });
  }, []);

  const defaultList = lists.find((l) => l.is_default);
  const myListItems = defaultList ? (items[defaultList.id] || []) : [];

  if (loading || !loaded) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="h-[85vh] w-full animate-pulse bg-zinc-900" />
        <div className="pt-8">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HERO */}
      {hero && !filterType && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-[85vh] w-full overflow-hidden"
        >
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: hero.backdrop_path ? `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})` : "none" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

          <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-[7vw] pt-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-4 flex items-center gap-3"
            >
              <span className="h-px w-8 bg-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">Trending Now</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-[clamp(36px,5vw,72px)] font-extrabold leading-[0.95] tracking-tight"
            >
              {hero.title || hero.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-white/70"
            >
              {hero.overview}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-6 flex items-center gap-3"
            >
              <Link
                href={`/watch/${hero.id}`}
                className="flex items-center gap-2 rounded bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 hover:scale-105 active:scale-95"
              >
                <Play size={16} fill="black" /> Play Now
              </Link>
              <Link
                href={`/title/${hero.id}`}
                className="flex items-center gap-2 rounded bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <Info size={16} /> More Info
              </Link>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* CONTENT ROWS */}
      <main className={`${filterType ? "pt-20" : "-mt-16"} relative z-10 pb-16`}>
        {/* PERSONALIZED ROWS */}
        {(!filterType || filterType === "movies" || filterType === "tv") && (
          <>
            {!historyLoading && <ContinueWatchingRow items={history} />}
            <MyListRow items={myListItems} />
          </>
        )}

        {(!filterType || filterType === "movies") && (
          <>
            <ContentRow label="Trending Movies" items={trendingMovies} />
            <ContentRow label="Popular Movies" items={popularMovies} />
            <ContentRow label="Top Rated Movies" items={topRatedMovies} />
          </>
        )}
        {(!filterType || filterType === "tv") && (
          <>
            <ContentRow label="Trending TV Shows" items={trendingTV} type="tv" />
            <ContentRow label="Popular TV Shows" items={popularTV} type="tv" />
          </>
        )}
      </main>
    </div>
  );
}
