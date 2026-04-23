"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

function SearchResults() {
  const { user, loading, activeProfile } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    else if (!loading && user && !activeProfile) router.push("/profiles");
  }, [user, loading, activeProfile, router]);
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setSearchLoading(true);
    fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results?.filter((r: any) => r.media_type === "movie" || r.media_type === "tv") || []);
        setSearchLoading(false);
      });
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-[7vw] py-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-lg font-semibold"
      >
        {query ? `Results for "${query}"` : "Search"}
      </motion.h1>
      {searchLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((item, i) => {
          const isTV = item.media_type === "tv";
          const href = isTV ? `/tv/${item.id}` : `/title/${item.id}`;
          const title = item.title || item.name;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={href} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800">
                  {item.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No Image</div>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-white/80 line-clamp-1">{title}</p>
                <span className="text-[10px] text-white/40">{isTV ? "TV" : "Movie"}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
      {!searchLoading && results.length === 0 && query && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-white/40"
        >
          <Search size={48} className="mb-4 opacity-30" />
          <p className="text-sm">No results found for "{query}"</p>
        </motion.div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <Navbar />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" /></div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
