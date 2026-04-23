"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Play } from "lucide-react";
import type { ListItem } from "@/lib/hooks/useProfileLists";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

interface EnrichedItem extends ListItem {
  poster?: string;
  title?: string;
}

export default function MyListRow({ items }: { items: ListItem[] }) {
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
          });
        } catch {
          // skip
        }
      }
      if (!cancelled) setEnriched(results);
    };

    void load();
    return () => { cancelled = true; };
  }, [items]);

  if (!enriched.length) return null;

  return (
    <div className="mb-8 px-[4vw]">
      <div className="mb-3 flex items-center gap-2">
        <Bookmark size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-white">My List</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {enriched.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative shrink-0 cursor-pointer"
            style={{ width: "clamp(140px, 16vw, 200px)" }}
          >
            <Link href={item.media_type === "tv" ? `/tv/${item.tmdb_id}` : `/title/${item.tmdb_id}`}>
              <div className="relative overflow-hidden rounded-xl bg-zinc-900 aspect-[2/3]">
                {item.poster ? (
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
              <p className="mt-2 truncate text-xs text-white/70">{item.title || "Untitled"}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
