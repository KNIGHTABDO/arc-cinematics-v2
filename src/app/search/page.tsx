"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Search } from "lucide-react";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setLoading(true);
    fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results?.filter((r: any) => r.media_type === "movie" || r.media_type === "tv") || []);
        setLoading(false);
      });
  }, [query]);

  return (
    <div className="px-[7vw] py-8">
      <h1 className="mb-6 text-lg font-semibold">
        {query ? `Results for "${query}"` : "Search"}
      </h1>
      {loading && <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {results.map((item) => {
          const isTV = item.media_type === "tv";
          const href = isTV ? `/tv/${item.id}` : `/title/${item.id}`;
          const title = item.title || item.name;
          return (
            <Link key={item.id} href={href} className="group block">
              <div className="aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800">
                {item.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No Image</div>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-white/80 line-clamp-1">{title}</p>
              <span className="text-[10px] text-white/40">{isTV ? "TV" : "Movie"}</span>
            </Link>
          );
        })}
      </div>
      {!loading && results.length === 0 && query && (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Search size={48} className="mb-4 opacity-30" />
          <p className="text-sm">No results found for "{query}"</p>
        </div>
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
