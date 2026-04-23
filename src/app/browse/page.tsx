"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import Link from "next/link";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export default function BrowsePage() {
  const { user, loading, signOut } = useSupabase();
  const router = useRouter();
  const [movies, setMovies] = useState<any[]>([]);
  const [tv, setTv] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`)
      .then((r) => r.json())
      .then((d) => setMovies(d.results?.slice(0, 12) || []));
    fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}`)
      .then((r) => r.json())
      .then((d) => setTv(d.results?.slice(0, 12) || []));
  }, []);

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold">ARC Cinematics</h1>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm text-white/70 hover:text-white">
            Settings
          </Link>
          <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300">
            Sign Out
          </button>
        </div>
      </header>

      <main className="px-6 py-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Trending Movies</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <Link key={m.id} href={`/stream/${m.id}`} className="group block">
              <div className="aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-white/80 line-clamp-1">{m.title}</p>
            </Link>
          ))}
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-white/50">Trending TV</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tv.map((t) => (
            <Link key={t.id} href={`/tv/${t.id}`} className="group block">
              <div className="aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
                {t.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${t.poster_path}`}
                    alt={t.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-white/80 line-clamp-1">{t.name}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
