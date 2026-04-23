"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { Navbar } from "@/components/layout/Navbar";
import { ContentRow } from "@/components/rows/ContentRow";
import { Play, Info } from "lucide-react";
import Link from "next/link";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export default function BrowseContent() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterType = searchParams.get("type");
  const [hero, setHero] = useState<any>(null);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

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

  if (loading || !loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HERO */}
      {hero && !filterType && (
        <section className="relative h-[85vh] w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: hero.backdrop_path ? `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})` : "none" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

          <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-[7vw] pt-16">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">Trending Now</span>
            </div>
            <h1 className="text-[clamp(36px,5vw,72px)] font-extrabold leading-[0.95] tracking-tight">
              {hero.title || hero.name}
            </h1>
            <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-white/70">
              {hero.overview}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={`/stream/${hero.id}`}
                className="flex items-center gap-2 rounded bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                <Play size={16} fill="black" /> Play Now
              </Link>
              <Link
                href={`/title/${hero.id}`}
                className="flex items-center gap-2 rounded bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <Info size={16} /> More Info
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CONTENT ROWS */}
      <main className={`${filterType ? "pt-20" : "-mt-16"} relative z-10 pb-16`}>
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
