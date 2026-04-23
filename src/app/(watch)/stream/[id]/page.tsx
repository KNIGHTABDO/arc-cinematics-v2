"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { usePlaybackOrchestrator } from "@/lib/playback/orchestrator";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Settings } from "lucide-react";

type ParsedId = {
  mediaType: "movie" | "tv";
  tmdbId: string;
  season?: number;
  episode?: number;
};

function parseWatchId(id: string): ParsedId {
  const tvMatch = id.match(/^tv-(\d+)-s(\d+)e(\d+)$/i);
  if (tvMatch) {
    return { mediaType: "tv", tmdbId: tvMatch[1], season: Number(tvMatch[2]), episode: Number(tvMatch[3]) };
  }
  return { mediaType: "movie", tmdbId: id };
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function StreamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const parsed = useMemo(() => parseWatchId(id), [id]);
  const { user } = useSupabase();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [subtitleOn, setSubtitleOn] = useState(true);
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef({ current: 0, duration: 0 });

  const orchestrator = usePlaybackOrchestrator({
    tmdbId: parsed.tmdbId,
    mediaType: parsed.mediaType,
    seasonNumber: parsed.season,
    episodeNumber: parsed.episode,
    userId: user?.id,
  });

  // Subtitle load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = new URL("/api/subtitles/proxy", window.location.origin);
        url.searchParams.set("tmdbId", parsed.tmdbId);
        url.searchParams.set("lang", "ar");
        url.searchParams.set("mediaType", parsed.mediaType);
        if (parsed.season) url.searchParams.set("season", String(parsed.season));
        if (parsed.episode) url.searchParams.set("episode", String(parsed.episode));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("No subtitle");
        const vtt = await res.text();
        const blob = new Blob([vtt], { type: "text/vtt;charset=utf-8" });
        const objUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setSubtitleSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return objUrl; });
        }
      } catch {
        if (!cancelled) setSubtitleSrc(null);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [parsed.tmdbId, parsed.mediaType, parsed.season, parsed.episode]);

  // Resume position
  useEffect(() => {
    if (orchestrator.resumeSeconds > 0 && videoRef.current) {
      videoRef.current.currentTime = orchestrator.resumeSeconds;
    }
  }, [orchestrator.resumeSeconds, orchestrator.activePlayableUrl]);

  // Video event handlers
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);
    progressRef.current = { current: v.currentTime, duration: v.duration || 0 };

    if (v.duration > 0 && v.currentTime / v.duration > 0.95 && parsed.mediaType === "tv" && !showNextPrompt) {
      setShowNextPrompt(true);
    }
  }, [parsed.mediaType, showNextPrompt]);

  const onEnded = useCallback(() => {
    if (parsed.mediaType === "tv" && !showNextPrompt) {
      setShowNextPrompt(true);
    }
  }, [parsed.mediaType, showNextPrompt]);

  const onError = useCallback(() => {
    setPlayerError("Playback failed. Switching to next candidate...");
    orchestrator.fallbackToNext();
  }, [orchestrator]);

  const onWaiting = useCallback(() => setBuffering(true), []);
  const onPlaying = useCallback(() => { setBuffering(false); setIsPlaying(true); }, []);
  const onPause = useCallback(() => setIsPlaying(false), []);

  // Save resume every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const { current, duration } = progressRef.current;
      if (current > 0 && user?.id) {
        void orchestrator.saveResume(current, duration);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [orchestrator, user?.id]);

  // Next episode countdown
  useEffect(() => {
    if (!showNextPrompt) return;
    const interval = setInterval(() => {
      setNextCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (parsed.season !== undefined && parsed.episode !== undefined) {
            const nextId = `tv-${parsed.tmdbId}-s${parsed.season}e${parsed.episode + 1}`;
            router.push(`/stream/${nextId}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showNextPrompt, parsed, router]);

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
    if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(v.currentTime);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  const handleQualityChange = useCallback(
    async (index: number) => {
      const currentTime = videoRef.current?.currentTime || 0;
      await orchestrator.negotiateAtIndex(index);
      setTimeout(() => {
        if (videoRef.current && currentTime > 0) {
          videoRef.current.currentTime = currentTime;
          videoRef.current.play().catch(() => {});
        }
      }, 500);
    },
    [orchestrator],
  );

  const activeIndex = orchestrator.currentIndex;

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-black text-white overflow-hidden"
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {!orchestrator.activePlayableUrl ? (
        <div className="flex h-full items-center justify-center text-sm text-white/70">
          {orchestrator.error || "Negotiating best stream..."}
        </div>
      ) : (
        <video
          ref={videoRef}
          src={orchestrator.activePlayableUrl}
          crossOrigin="anonymous"
          playsInline
          className="h-full w-full"
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onError={onError}
          onWaiting={onWaiting}
          onPlaying={onPlaying}
          onPause={onPause}
          autoPlay
        >
          {subtitleOn && subtitleSrc ? (
            <track kind="subtitles" src={subtitleSrc} label="Arabic" srcLang="ar" default />
          ) : null}
        </video>
      )}

      {/* Buffering spinner */}
      {buffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-amber-500" />
        </div>
      )}

      {/* Top overlay */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-4 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="pointer-events-auto text-sm font-medium">
          {parsed.mediaType === "tv"
            ? `S${parsed.season}E${parsed.episode} · ${orchestrator.activeFilename || ""}`
            : orchestrator.activeFilename || `Movie ${parsed.tmdbId}`}
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            onClick={() => setSubtitleOn((v) => !v)}
            className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
          >
            {subtitleOn ? "CC: ON" : "CC: OFF"}
          </button>
        </div>
      </div>

      {/* Error toast */}
      {playerError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
          <div className="rounded bg-red-500/90 px-4 py-2 text-xs text-white">{playerError}</div>
        </div>
      )}

      {/* Bottom controls */}
      <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-12 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Progress bar */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs text-white/70 w-12 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-amber-500"
          />
          <span className="text-xs text-white/70 w-12">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="rounded p-2 hover:bg-white/10">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={toggleMute} className="rounded p-2 hover:bg-white/10">
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 accent-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Quality picker */}
            {orchestrator.scoredStreams.length > 1 && (
              <div className="flex items-center gap-1">
                <Settings size={16} className="text-white/60" />
                {orchestrator.scoredStreams.slice(0, 5).map((stream, i) => (
                  <button
                    key={stream.infoHash}
                    onClick={() => void handleQualityChange(i)}
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      i === activeIndex ? "border-amber-500 text-amber-400" : "border-white/20 text-white/50 hover:border-white/40"
                    }`}
                    title={stream.title}
                  >
                    {stream.title.includes("2160p") || stream.title.includes("4K")
                      ? "4K"
                      : stream.title.includes("1080p")
                      ? "1080p"
                      : stream.title.includes("720p")
                      ? "720p"
                      : "SD"}
                  </button>
                ))}
              </div>
            )}
            <button onClick={toggleFullscreen} className="rounded p-2 hover:bg-white/10">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Next episode prompt */}
      {showNextPrompt && parsed.mediaType === "tv" && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="rounded-xl bg-zinc-900 p-6 text-center shadow-2xl max-w-sm">
            <h3 className="mb-2 text-lg font-semibold">Next Episode</h3>
            <p className="mb-4 text-sm text-white/70">Playing in {nextCountdown} seconds...</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  if (parsed.season !== undefined && parsed.episode !== undefined) {
                    const nextId = `tv-${parsed.tmdbId}-s${parsed.season}e${parsed.episode + 1}`;
                    router.push(`/stream/${nextId}`);
                  }
                }}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
              >
                Play Now
              </button>
              <button
                onClick={() => setShowNextPrompt(false)}
                className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
