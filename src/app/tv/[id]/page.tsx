"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/supabase-provider";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { Navbar } from "@/components/layout/Navbar";
import { Play, Star, Calendar, ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import { motion } from "framer-motion";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export default function TVDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading, activeProfile } = useSupabase();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);

  const { lists, isInList, addToList, removeFromList } = useProfileLists(activeProfile?.id);
  const defaultList = lists.find((l) => l.is_default);
  const inList = defaultList ? isInList(defaultList.id, id, "tv") : false;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    else if (!loading && user && !activeProfile) router.push("/profiles");
  }, [user, loading, activeProfile, router]);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&append_to_response=credits`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setSeasons(d.seasons || []); });
  }, [id]);

  const toggleList = async () => {
    if (!defaultList) return;
    if (inList) await removeFromList(defaultList.id, id, "tv");
    else await addToList(defaultList.id, id, "tv");
  };

  if (loading || !detail) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
        </div>
      </div>
    );
  }

  const year = detail.first_air_date?.slice(0, 4);
  const cast = detail.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(", ");

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Backdrop Hero */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: detail.backdrop_path ? `url(https://image.tmdb.org/t/p/original${detail.backdrop_path})` : "none" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

        <div className="relative z-10 flex h-full items-end px-[7vw] pb-12">
          <div className="max-w-2xl">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-1 text-sm text-white/50 hover:text-white transition"
            >
              <ArrowLeft size={16} /> Back
            </motion.button>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-[clamp(32px,5vw,64px)] font-extrabold leading-[0.95]"
            >
              {detail.name}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60"
            >
              {year && <span className="flex items-center gap-1"><Calendar size={14} /> {year}</span>}
              <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> {detail.vote_average?.toFixed(1)}</span>
              <span>{detail.number_of_seasons} Season{detail.number_of_seasons !== 1 ? "s" : ""}</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/70"
            >
              {detail.overview}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-6 flex items-center gap-3"
            >
              {defaultList && (
                <button
                  onClick={toggleList}
                  className={`flex items-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition hover:scale-105 active:scale-95 ${
                    inList ? "bg-white/20 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {inList ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  {inList ? "In My List" : "Add to List"}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-[4vw] py-10"
      >
        {cast && <p className="text-sm text-white/50">Cast: <span className="text-white/80">{cast}</span></p>}
        {detail.genres?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.genres.map((g: any) => (
              <span key={g.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{g.name}</span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Seasons */}
      <div className="px-[4vw] pb-16">
        {seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-3">{s.name}</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: s.episode_count || 0 }).map((_, i) => {
                const ep = i + 1;
                return (
                  <Link
                    key={ep}
                    href={`/play/tv-${id}-s${s.season_number}e${ep}`}
                    className="flex items-center gap-1 rounded bg-zinc-800/80 px-3 py-1.5 text-xs hover:bg-amber-500 hover:text-black transition"
                  >
                    <Play size={10} /> E{ep}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
