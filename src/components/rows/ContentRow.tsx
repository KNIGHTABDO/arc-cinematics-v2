"use client";

import { useRef, useEffect } from "react";
import { MovieCard, HeroCard, type TMDBMovie } from "@/components/cards/MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface ContentRowProps {
  label: string;
  items: TMDBMovie[];
  variant?: "default" | "hero";
  type?: "movie" | "tv";
}

export function ContentRow({ label, items, variant = "default", type = "movie" }: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const down = (e: PointerEvent) => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
    const move = (e: PointerEvent) => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.2; };
    const up = () => { isDown = false; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const scroll = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * window.innerWidth * 0.75, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="relative mb-8"
    >
      <div className="mb-3 flex items-center justify-between px-[4vw]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">{label}</h2>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll(1)} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto px-[4vw] pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, i) =>
          variant === "hero" ? (
            <HeroCard key={item.id} movie={item} type={type} index={i} />
          ) : (
            <MovieCard key={item.id} movie={item} type={type} index={i} />
          )
        )}
      </div>
    </motion.section>
  );
}
