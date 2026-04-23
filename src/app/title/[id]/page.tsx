"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Play, Star, Calendar, Clock, ArrowLeft } from "lucide-react";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export default function TitleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [movie, setMovie] = useState<any>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&append_to_response=credits`)
      .then((r) => r.json())
      .then((d) => setMovie(d));
    fetch(`https://api.themoviedb.org/3/movie/${id}/similar?api_key=${TMDB_KEY}`)
      .then((r) => r.json())
      .then((d) => setSimilar(d.results?.slice(0, 6) || []));
  }, [id]);

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
        </div>
      </div>
    );
  }

  const year = movie.release_date?.slice(0, 4);
  const directors = movie.credits?.crew?.filter((c: any) => c.job === "Director").map((c: any) => c.name).join(", ");
  const cast = movie.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(", ");

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Backdrop Hero */}
      <div className="relative h-[70vh] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: movie.backdrop_path ? `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` : "none" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

        <div className="relative z-10 flex h-full items-end px-[7vw] pb-12">
          <div className="max-w-2xl">
            <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-white/50 hover:text-white">
              <ArrowLeft size={16} /> Back
            </button>
            <h1 className="text-[clamp(32px,5vw,64px)] font-extrabold leading-[0.95]">{movie.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
              {year && <span className="flex items-center gap-1"><Calendar size={14} /> {year}</span>}
              <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> {movie.vote_average?.toFixed(1)}</span>
              {movie.runtime > 0 && <span className="flex items-center gap-1"><Clock size={14} /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
            </div>
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/70">{movie.overview}</p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={`/stream/${movie.id}`}
                className="flex items-center gap-2 rounded bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                <Play size={16} fill="black" /> Watch Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-[7vw] py-10">
        {directors && <p className="text-sm text-white/50">Director: <span className="text-white/80">{directors}</span></p>}
        {cast && <p className="mt-1 text-sm text-white/50">Cast: <span className="text-white/80">{cast}</span></p>}
        {movie.genres?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {movie.genres.map((g: any) => (
              <span key={g.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{g.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div className="px-[7vw] pb-16">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">More Like This</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {similar.map((m) => (
              <Link key={m.id} href={`/title/${m.id}`} className="group block shrink-0" style={{ width: "clamp(140px, 16vw, 200px)" }}>
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800">
                  {m.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w342${m.poster_path}`} alt={m.title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-medium text-white/80 line-clamp-1">{m.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
