"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TorrentStream } from "@/lib/playback/scoring-engine";
import { StreamScoringEngine } from "@/lib/playback/scoring-engine";

interface StreamResponse {
  source: string;
  streams: TorrentStream[];
}

interface UnrestrictResponse {
  playableUrl?: string;
  filename?: string;
  pending?: boolean;
  notCached?: boolean;
  status?: string;
  progress?: number;
  torrentId?: string;
  message?: string;
  error?: string;
}

interface TorrentioStream {
  name?: string;
  title?: string;
  infoHash?: string;
  behaviorHints?: { bingeGroup?: string };
}

interface TorrentioResponse {
  streams?: TorrentioStream[];
}

function getClientCapabilities() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const supportsHEVC = isIOS && /iP(hone|ad|od) OS 1[1-9]|Mac OS X 1[0-9]/.test(ua);
  return { isIOS, supportsHEVC, preferredLanguage: "en" };
}

function parseTorrentio(data: TorrentioResponse): TorrentStream[] {
  const streams = data.streams || [];
  return streams
    .map((s) => {
      const infoHash = s.infoHash?.trim().toLowerCase();
      if (!infoHash || infoHash.length !== 40) return null;
      if (!/^[a-f0-9]{40}$/.test(infoHash)) return null;
      if (infoHash === "0".repeat(40)) return null;
      const title = s.title || s.name || `Stream ${infoHash.slice(0, 8)}`;
      const quality = /2160p|4k/i.test(title) ? "2160p" : /1080p/i.test(title) ? "1080p" : /720p/i.test(title) ? "720p" : "SD";
      const container = StreamScoringEngine.detectContainer(title);
      return {
        title: `${quality} · ${title}`.slice(0, 120),
        infoHash,
        sizeBytes: 0,
        seeders: 100,
        source: "torrentio",
        container,
      } as TorrentStream;
    })
    .filter(Boolean) as TorrentStream[];
}

async function fetchTorrentio(tmdbId: string, mediaType: "movie" | "tv", season?: number, episode?: number): Promise<TorrentStream[]> {
  let url: string;
  if (mediaType === "tv" && season !== undefined && episode !== undefined) {
    url = `https://torrentio.strem.fun/stream/series/${tmdbId}:${season}:${episode}.json`;
  } else {
    url = `https://torrentio.strem.fun/stream/movie/${tmdbId}.json`;
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as TorrentioResponse;
  return parseTorrentio(data);
}

async function fetchTPB(tmdbId: string, mediaType: "movie" | "tv", season?: number, episode?: number): Promise<TorrentStream[]> {
  const url = new URL("/api/stream/resolve", window.location.origin);
  url.searchParams.set("tmdbId", tmdbId);
  url.searchParams.set("type", mediaType);
  if (season) url.searchParams.set("season", String(season));
  if (episode) url.searchParams.set("episode", String(episode));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as StreamResponse;
  // Tag containers from TPB titles if possible
  return (data.streams || []).map((s) => ({
    ...s,
    container: s.container || StreamScoringEngine.detectContainer(s.title),
  }));
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
  const isRunning = useRef(false);

  // 1. Resolve streams on mount + score them
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setPendingStatus(null);
      try {
        let streams = await fetchTorrentio(params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber);
        if (streams.length === 0) {
          streams = await fetchTPB(params.tmdbId, params.mediaType, params.seasonNumber, params.episodeNumber);
        }
        if (!cancelled) {
          // Score and rank streams by client capabilities
          const caps = getClientCapabilities();
          const ranked = StreamScoringEngine.rankStreams(streams, caps);
          setScoredStreams(ranked);
          setCurrentIndex(0);
          if (ranked.length === 0) {
            setError("No streams found. This title may not be available yet.");
          }
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
    if (scoredStreams.length > 0 && !activePlayableUrl && !isLoading && !error && !pendingStatus) {
      void negotiateAtIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredStreams, activePlayableUrl, isLoading, error, pendingStatus]);

  const negotiateAtIndex = useCallback(
    async (index: number) => {
      if (isRunning.current) return; // prevent concurrent attempts
      if (index < 0 || index >= scoredStreams.length) {
        setError("No more streams available.");
        return;
      }

      isRunning.current = true;
      const target = scoredStreams[index];
      setCurrentIndex(index);
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
            title: target.title,
            // no mode = rapid cache check (default)
          }),
        });
        const data = (await res.json()) as UnrestrictResponse;

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.playableUrl) {
          setActivePlayableUrl(data.playableUrl);
          setActiveFilename(data.filename || target.title);
          setPendingStatus(null);
          isRunning.current = false;
          return;
        }

        if (data.notCached) {
          // Try next candidate immediately
          const next = index + 1;
          if (next < scoredStreams.length) {
            setPendingStatus({
              status: "trying_next",
              progress: Math.round(((index + 1) / scoredStreams.length) * 100),
            });
            isRunning.current = false;
            void negotiateAtIndex(next);
            return;
          }
          throw new Error("This title is not cached on Real-Debrid. Try again later or pick a different title.");
        }

        if (data.pending) {
          // Long poll mode — only if server explicitly returns pending
          setPendingStatus({
            status: data.status || "preparing",
            progress: data.progress || 0,
            torrentId: data.torrentId,
          });
          isRunning.current = false;
          return;
        }

        throw new Error("No playable URL returned");
      } catch (e: any) {
        setError(e.message || "Failed to unrestrict stream");
      } finally {
        setIsLoading(false);
        isRunning.current = false;
      }
    },
    [scoredStreams, params.userId],
  );

  const fallbackToNext = useCallback(() => {
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
    setError(null);
    setPendingStatus(null);
    void negotiateAtIndex(currentIndex);
  }, [currentIndex, negotiateAtIndex]);

  // 3. Resume position loader
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

  // 4. Save resume position every 10s
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
