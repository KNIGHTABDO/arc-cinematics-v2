"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TorrentStream } from "@/lib/playback/scoring-engine";

interface StreamResponse {
  source: string;
  streams: TorrentStream[];
}

interface UnrestrictResponse {
  playableUrl?: string;
  filename?: string;
  pending?: boolean;
  status?: string;
  progress?: number;
  torrentId?: string;
  message?: string;
  error?: string;
}

export function usePlaybackOrchestrator(params: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  seasonNumber?: number;
  episodeNumber?: number;
  profileId?: string;
  userId?: string;
}) {
  const [scoredStreams, setScoredStreams] = useState<TorrentStream[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePlayableUrl, setActivePlayableUrl] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ status: string; progress: number; torrentId?: string } | null>(null);
  const resumeSaved = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Resolve streams on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setPendingStatus(null);
      try {
        const url = new URL("/api/stream/resolve", window.location.origin);
        url.searchParams.set("tmdbId", params.tmdbId);
        url.searchParams.set("type", params.mediaType);
        if (params.seasonNumber) url.searchParams.set("season", String(params.seasonNumber));
        if (params.episodeNumber) url.searchParams.set("episode", String(params.episodeNumber));

        const res = await fetch(url.toString());
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Stream resolution failed (${res.status})`);
        }
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
    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber]);

  // 2. Auto-negotiate first stream when resolved
  useEffect(() => {
    if (scoredStreams.length > 0 && !activePlayableUrl && !isLoading && !error && !pendingStatus) {
      void negotiateAtIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredStreams, activePlayableUrl, isLoading, error, pendingStatus]);

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const negotiateAtIndex = useCallback(
    async (index: number, existingTorrentId?: string) => {
      if (index < 0 || index >= scoredStreams.length) {
        setError("No more streams available.");
        return;
      }
      const target = scoredStreams[index];
      setIsLoading(true);
      setError(null);
      setPendingStatus(null);
      try {
        const res = await fetch("/api/stream/unrestrict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            infoHash: target.infoHash,
            userId: params.userId,
            torrentId: existingTorrentId,
            title: target.title,
          }),
        });
        const data = (await res.json()) as UnrestrictResponse;

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.pending) {
          setCurrentIndex(index);
          setPendingStatus({
            status: data.status || "preparing",
            progress: data.progress || 0,
            torrentId: data.torrentId,
          });
          setIsLoading(false);
          // Start polling
          clearPolling();
          let attempts = 0;
          const maxAttempts = 30; // ~150 seconds
          pollingRef.current = setInterval(() => {
            attempts++;
            if (attempts > maxAttempts) {
              clearPolling();
              setError("Stream preparation timed out. Try another quality or retry.");
              setPendingStatus(null);
              return;
            }
            void negotiateAtIndex(index, data.torrentId);
          }, 5000);
          return;
        }

        if (data.playableUrl) {
          clearPolling();
          setCurrentIndex(index);
          setActivePlayableUrl(data.playableUrl);
          setActiveFilename(data.filename || target.title);
          setPendingStatus(null);
        } else {
          throw new Error("No playable URL returned");
        }
      } catch (e: any) {
        clearPolling();
        setError(e.message || "Failed to unrestrict stream");
      } finally {
        setIsLoading(false);
      }
    },
    [scoredStreams, params.userId],
  );

  const fallbackToNext = useCallback(() => {
    clearPolling();
    setPendingStatus(null);
    setError(null);
    const next = currentIndex + 1;
    if (next < scoredStreams.length) {
      void negotiateAtIndex(next);
    } else {
      setError("All candidate streams failed.");
    }
  }, [currentIndex, scoredStreams.length, negotiateAtIndex]);

  const retryCurrent = useCallback(() => {
    clearPolling();
    setError(null);
    setPendingStatus(null);
    void negotiateAtIndex(currentIndex);
  }, [currentIndex, negotiateAtIndex]);

  // 3. Resume position loader (milliseconds → seconds for video element)
  const [resumeSeconds, setResumeSeconds] = useState(0);
  useEffect(() => {
    if (!params.profileId) return;
    let cancelled = false;
    fetch("/api/playback/history?" + new URLSearchParams({
      profileId: params.profileId,
      tmdbId: params.tmdbId,
      mediaType: params.mediaType,
      season: params.seasonNumber ? String(params.seasonNumber) : "",
      episode: params.episodeNumber ? String(params.episodeNumber) : "",
    })).then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (data?.position_ms) setResumeSeconds(data.position_ms / 1000);
    });
    return () => { cancelled = true; };
  }, [params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber, params.profileId]);

  // 4. Save resume position every 10s (convert seconds → milliseconds)
  const saveResume = useCallback(
    async (seconds: number, duration: number) => {
      if (!params.profileId || !params.userId || resumeSaved.current) return;
      resumeSaved.current = true;
      try {
        await fetch("/api/playback/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: params.profileId,
            userId: params.userId,
            tmdbId: params.tmdbId,
            mediaType: params.mediaType,
            seasonNumber: params.seasonNumber,
            episodeNumber: params.episodeNumber,
            positionMs: Math.floor(seconds * 1000),
            durationMs: Math.floor(duration * 1000),
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
    pendingStatus,
    resumeSeconds,
    negotiateAtIndex,
    fallbackToNext,
    retryCurrent,
    saveResume,
  };
}
