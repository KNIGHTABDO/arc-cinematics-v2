"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";
import type { WatchHistoryItem } from "@/lib/hooks/useProfileHistory";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

interface EnrichedItem extends WatchHistoryItem {
  poster?: string;
  title?: string;
  backdrop?: string;
}

export default function ContinueWatchingRow({ items }: { items: WatchHistoryItem[] }) {
  const [enriched, setEnriched] = useState<EnrichedItem[]>([]);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;

    const load = async () => {
      const results: EnrichedItem[] = [];
      for (const item of items.slice(0, 12)) {
        try {
          const endpoint =
            item.media_type === "tv"
              ? `https://api.themoviedb.org/3/tv/${item.tmdb_id}?api_key=${TMDB_KEY}&language=en-US`
              : `https://api.themoviedb.org/3/movie/${item.tmdb_id}?api_key=${TMDB_KEY}&language=en-US`;
          const res = await fetch(endpoint);
          if (!res.ok) continue;
          const data = await res.json();
          results.push({
            ...item,
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : undefined,
            title: data.title || data.name,
            backdrop: data.backdrop_path,
          });
        } catch {
          // skip failed fetches
        }
      }
      if (!cancelled) setEnriched(results);
    };

    void load();
    return () => { cancelled = true; };
  }, [items]);

  if (!enriched.length) return null;

  const getLink = (item: EnrichedItem) => {
    if (item.media_type === "tv" && item.season_number !== undefined && item.episode_number !== undefined) {
      return `/stream/tv-${item.tmdb_id}-s${item.season_number}e${item.episode_number}`;
    }
    return `/stream/${item.tmdb_id}`;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="mb-8 px-[4vw]">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-white">Continue Watching</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {enriched.map((item, i) => {
          const progress = item.duration_ms > 0 ? (item.position_ms / item.duration_ms) * 100 : 0;
          const label = item.media_type === "tv" && item.season_number !== undefined && item.episode_number !== undefined
            ? `S${item.season_number}E${item.episode_number}`
            : "Movie";

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative shrink-0 cursor-pointer"
              style={{ width: "clamp(200px, 22vw, 280px)" }}
            >
              <Link href={getLink(item)}>
                <div className="relative overflow-hidden rounded-lg bg-zinc-900 aspect-video">
                  {item.backdrop ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.backdrop}`}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                      <Play size={24} className="text-white/30" />
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <div className="rounded-full bg-amber-500 p-2">
                      <Play size={20} className="text-black" fill="black" />
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="truncate text-sm font-medium text-white">{item.title || "Untitled"}</p>
                  <p className="text-[11px] text-white/50">
                    {label} · {formatTime(item.position_ms)} / {formatTime(item.duration_ms)}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
