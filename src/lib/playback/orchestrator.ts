"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TorrentStream } from "@/lib/playback/scoring-engine";

interface StreamResponse {
  source: string;
  streams: TorrentStream[];
}

interface UnrestrictResponse {
  playableUrl: string;
  filename?: string;
}

export function usePlaybackOrchestrator(params: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  seasonNumber?: number;
  episodeNumber?: number;
  userId?: string;
}) {
  const [scoredStreams, setScoredStreams] = useState<TorrentStream[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePlayableUrl, setActivePlayableUrl] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumeSaved = useRef(false);

  // 1. Resolve streams on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL("/api/stream/resolve", window.location.origin);
        url.searchParams.set("tmdbId", params.tmdbId);
        url.searchParams.set("type", params.mediaType);
        if (params.seasonNumber) url.searchParams.set("season", String(params.seasonNumber));
        if (params.episodeNumber) url.searchParams.set("episode", String(params.episodeNumber));

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Stream resolution failed");
        const data = (await res.json()) as StreamResponse;
        if (!cancelled) {
          setScoredStreams(data.streams || []);
          setCurrentIndex(0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to resolve streams");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber]);

  // 2. Auto-negotiate first stream when resolved
  useEffect(() => {
    if (scoredStreams.length > 0 && !activePlayableUrl && !isLoading && !error) {
      void negotiateAtIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredStreams, activePlayableUrl, isLoading, error]);

  const negotiateAtIndex = useCallback(
    async (index: number) => {
      if (index < 0 || index >= scoredStreams.length) {
        setError("No more streams available.");
        return;
      }
      const target = scoredStreams[index];
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stream/unrestrict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ infoHash: target.infoHash, userId: params.userId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Unrestrict failed");
        }
        const data = (await res.json()) as UnrestrictResponse;
        setCurrentIndex(index);
        setActivePlayableUrl(data.playableUrl);
        setActiveFilename(data.filename || target.title);
      } catch (e: any) {
        setError(e.message || "Failed to unrestrict stream");
      } finally {
        setIsLoading(false);
      }
    },
    [scoredStreams, params.userId],
  );

  const fallbackToNext = useCallback(() => {
    const next = currentIndex + 1;
    if (next < scoredStreams.length) {
      void negotiateAtIndex(next);
    } else {
      setError("All candidate streams failed.");
    }
  }, [currentIndex, scoredStreams.length, negotiateAtIndex]);

  // 3. Resume position loader
  const [resumeSeconds, setResumeSeconds] = useState(0);
  useEffect(() => {
    if (!params.userId) return;
    let cancelled = false;
    fetch("/api/playback/history?" + new URLSearchParams({
      tmdbId: params.tmdbId,
      mediaType: params.mediaType,
      season: params.seasonNumber ? String(params.seasonNumber) : "",
      episode: params.episodeNumber ? String(params.episodeNumber) : "",
    })).then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (data?.timestamp_seconds) setResumeSeconds(data.timestamp_seconds);
    });
    return () => { cancelled = true; };
  }, [params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber, params.userId]);

  // 4. Save resume position every 10s
  const saveResume = useCallback(
    async (seconds: number, duration: number) => {
      if (!params.userId || resumeSaved.current) return;
      resumeSaved.current = true;
      try {
        await fetch("/api/playback/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: params.userId,
            tmdbId: params.tmdbId,
            mediaType: params.mediaType,
            seasonNumber: params.seasonNumber,
            episodeNumber: params.episodeNumber,
            timestampSeconds: Math.floor(seconds),
            durationSeconds: Math.floor(duration),
            completed: seconds / duration > 0.95,
          }),
        });
      } catch {}
      setTimeout(() => { resumeSaved.current = false; }, 10000);
    },
    [params],
  );

  return {
    scoredStreams,
    currentIndex,
    activePlayableUrl,
    activeFilename,
    isLoading,
    error,
    resumeSeconds,
    negotiateAtIndex,
    fallbackToNext,
    saveResume,
  };
}
