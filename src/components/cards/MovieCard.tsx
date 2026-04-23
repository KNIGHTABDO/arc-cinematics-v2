"use client";

import Link from "next/link";

export interface TMDBMovie {
  id: number | string;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  media_type?: string;
}

export function MovieCard({ movie, type = "movie" }: { movie: TMDBMovie; type?: "movie" | "tv" }) {
  const title = movie.title || movie.name || "Untitled";
  const href = type === "tv" ? `/tv/${movie.id}` : `/title/${movie.id}`;
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);

  return (
    <Link
      href={href}
      className="group relative block shrink-0 overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
      style={{ width: "clamp(140px, 16vw, 200px)" }}
    >
      <div className="aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No Image</div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium text-white/90 line-clamp-1">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-amber-500">★ {movie.vote_average?.toFixed(1) || "0.0"}</span>
          {year && <span className="text-[10px] text-white/40">{year}</span>}
        </div>
      </div>
    </Link>
  );
}

export function HeroCard({ movie, type = "movie" }: { movie: TMDBMovie; type?: "movie" | "tv" }) {
  const title = movie.title || movie.name || "Untitled";
  const href = type === "tv" ? `/tv/${movie.id}` : `/title/${movie.id}`;

  return (
    <Link
      href={href}
      className="group relative block shrink-0 overflow-hidden rounded-xl border border-white/[0.07] transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_20px_60px_-15px_rgba(245,158,11,0.25)]"
      style={{ width: "clamp(260px, 22vw, 340px)", aspectRatio: "16 / 9" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
        style={{ backgroundImage: movie.backdrop_path ? `url(https://image.tmdb.org/t/p/w780${movie.backdrop_path})` : "none" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
        <p className="mt-0.5 text-[10px] text-white/60 line-clamp-2">{movie.overview}</p>
      </div>
    </Link>
  );
}
