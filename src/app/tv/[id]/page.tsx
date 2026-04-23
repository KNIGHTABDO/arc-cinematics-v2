"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export default function TVDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setSeasons(d.seasons || []); });
  }, [id]);

  if (!detail) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 py-4">
        <Link href="/browse" className="text-sm text-white/50 hover:text-white">← Back</Link>
        <h1 className="mt-4 text-2xl font-bold">{detail.name}</h1>
        <p className="mt-2 text-sm text-white/60">{detail.overview}</p>
      </div>
      <div className="px-6 py-4">
        {seasons.map((s: any) => (
          <div key={s.id} className="mb-4">
            <h3 className="text-sm font-semibold">{s.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: s.episode_count || 0 }).map((_, i) => {
                const ep = i + 1;
                return (
                  <Link
                    key={ep}
                    href={`/stream/tv-${id}-s${s.season_number}e${ep}`}
                    className="rounded bg-zinc-800 px-3 py-1 text-xs hover:bg-amber-500 hover:text-black"
                  >
                    E{ep}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
