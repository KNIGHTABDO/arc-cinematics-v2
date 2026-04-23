"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { usePlaybackOrchestrator } from "@/lib/playback/orchestrator";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RefreshCw, ArrowRight, Globe, Crown } from "lucide-react";
import { buildFreeEmbedUrls, isIOS } from "@/lib/streaming/free-sources";

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

type SourceMode = "free" | "premium";

export default function StreamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading, activeProfile } = useSupabase();
  const parsed = useMemo(() => parseWatchId(id), [id]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [subtitleOn, setSubtitleOn] = useState(true);
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
  const [subtitleLang, setSubtitleLang] = useState("ar");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [mkvWarningShown, setMkvWarningShown] = useState(false);
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
  const playAttemptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Free stream state (iOS only)
  const [sourceMode, setSourceMode] = useState<SourceMode>("premium");
  const [freeSources, setFreeSources] = useState<{ name: string; url: string }[]>([]);
  const [activeFreeIndex, setActiveFreeIndex] = useState(0);
  const [iosDetected, setIosDetected] = useState(false);

  const orchestrator = usePlaybackOrchestrator({
    tmdbId: parsed.tmdbId,
    mediaType: parsed.mediaType,
    seasonNumber: parsed.season,
    episodeNumber: parsed.episode,
    profileId: activeProfile?.id,
    userId: user?.id,
  });

  // Detect iOS and prepare free sources
  useEffect(() => {
    const ios = isIOS();
    setIosDetected(ios);
    if (ios) {
      const sources = buildFreeEmbedUrls({
        tmdbId: parsed.tmdbId,
        mediaType: parsed.mediaType,
        season: parsed.season,
        episode: parsed.episode,
      });
      setFreeSources(sources);
      // Default iOS to free mode for instant playback
      setSourceMode("free");
    }
  }, [parsed.tmdbId, parsed.mediaType, parsed.season, parsed.episode]);

  // Auth + profile gates
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !activeProfile) router.push("/profiles");
  }, [user, loading, activeProfile, router]);

  // Load preferred subtitle language
  useEffect(() => {
    const saved = localStorage.getItem("arc-settings");
    if (saved) {
      try { setSubtitleLang(JSON.parse(saved).language || "ar"); } catch {}
    }
  }, []);

  // Subtitle load (only for premium/RD mode)
  useEffect(() => {
    if (sourceMode !== "premium") return;
    let cancelled = false;
    const load = async () => {
      try {
        const url = new URL("/api/subtitles/proxy", window.location.origin);
        url.searchParams.set("tmdbId", parsed.tmdbId);
        url.searchParams.set("lang", subtitleLang);
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
  }, [parsed.tmdbId, parsed.mediaType, parsed.season, parsed.episode, subtitleLang, sourceMode]);

  // Auto-fallback if video doesn't start playing within 10s
  useEffect(() => {
    if (sourceMode !== "premium" || !orchestrator.activePlayableUrl) return;
    if (playAttemptTimer.current) clearTimeout(playAttemptTimer.current);
    playAttemptTimer.current = setTimeout(() => {
      if (!isPlaying && !buffering) {
        const isMkv = orchestrator.activeFilename?.toLowerCase().endsWith(".mkv");
        setPlayerError(isMkv ? "MKV not loading. Trying next stream..." : "Stream not loading. Trying next...");
        setTimeout(() => {
          setPlayerError(null);
          orchestrator.fallbackToNext();
        }, 1500);
      }
    }, 10000);
    return () => {
      if (playAttemptTimer.current) clearTimeout(playAttemptTimer.current);
    };
  }, [orchestrator.activePlayableUrl, orchestrator.activeFilename, isPlaying, buffering, sourceMode]);

  // Resume position
  useEffect(() => {
    if (sourceMode !== "premium") return;
    if (orchestrator.resumeSeconds > 0 && videoRef.current) {
      videoRef.current.currentTime = orchestrator.resumeSeconds;
    }
  }, [orchestrator.resumeSeconds, orchestrator.activePlayableUrl, sourceMode]);

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
    const isMkv = orchestrator.activeFilename?.toLowerCase().endsWith(".mkv");
    if (isMkv && !mkvWarningShown) {
      setMkvWarningShown(true);
      setPlayerError("MKV format not supported on this device. Trying next stream...");
    } else {
      setPlayerError("Playback failed. Switching to next candidate...");
    }
    setTimeout(() => {
      setPlayerError(null);
      orchestrator.fallbackToNext();
    }, 2000);
  }, [orchestrator, mkvWarningShown]);

  const onWaiting = useCallback(() => setBuffering(true), []);
  const onPlaying = useCallback(() => {
    setBuffering(false);
    setIsPlaying(true);
    setMkvWarningShown(false);
    if (playAttemptTimer.current) {
      clearTimeout(playAttemptTimer.current);
      playAttemptTimer.current = null;
    }
  }, []);
  const onPause = useCallback(() => setIsPlaying(false), []);

  // Save resume every 10s
  useEffect(() => {
    if (sourceMode !== "premium") return;
    const interval = setInterval(() => {
      const { current, duration } = progressRef.current;
      if (current > 0 && user?.id) {
        void orchestrator.saveResume(current, duration);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [orchestrator, user?.id, sourceMode]);

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

  // Free stream: switch to next embed source
  const switchFreeSource = useCallback((index: number) => {
    setActiveFreeIndex(index);
  }, []);

  // Loading / Pending / Error states (premium mode)
  const renderPlayerState = () => {
    if (sourceMode !== "premium") return null;
    if (orchestrator.activePlayableUrl) return null;

    if (orchestrator.pendingStatus) {
      const statusLabels: Record<string, string> = {
        magnet_conversion: "Converting magnet...",
        waiting_files_selection: "Selecting files...",
        queued: "Queued...",
        downloading: "Downloading to cache...",
        compressing: "Processing...",
        uploading: "Processing...",
      };
      const label = statusLabels[orchestrator.pendingStatus.status] || "Preparing stream...";
      const progress = orchestrator.pendingStatus.progress || 0;

      return (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-500" />
          <div className="text-center">
            <p className="text-base font-medium text-white">{label}</p>
            <p className="mt-1 text-xs text-white/50">This can take 30–90 seconds for uncached torrents</p>
          </div>
          {progress > 0 && (
            <div className="w-64">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-center text-[10px] text-white/40">{progress}%</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => orchestrator.retryCurrent()} className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition">
              <RefreshCw size={12} /> Refresh Now
            </button>
            <button onClick={() => orchestrator.fallbackToNext()} className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition">
              <ArrowRight size={12} /> Try Next
            </button>
          </div>
        </div>
      );
    }

    if (orchestrator.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
          <div className="rounded-full bg-red-500/10 p-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
            </svg>
          </div>
          <p className="text-center text-sm text-white/60 max-w-md">{orchestrator.error}</p>
          <div className="flex gap-3">
            <button onClick={() => orchestrator.retryCurrent()} className="rounded bg-amber-500 px-4 py-2 text-xs font-medium text-black hover:bg-amber-400 transition">
              Retry
            </button>
            <button onClick={() => orchestrator.fallbackToNext()} className="rounded bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition">
              Try Next Stream
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-amber-500" />
        <p className="text-sm text-white/50">Finding best stream...</p>
      </div>
    );
  };

  const activeFreeUrl = freeSources[activeFreeIndex]?.url;

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-black text-white overflow-hidden"
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {renderPlayerState()}

      {/* PREMIUM PLAYER (RD) */}
      {sourceMode === "premium" && orchestrator.activePlayableUrl && (
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
            <track kind="subtitles" src={subtitleSrc} label={subtitleLang.toUpperCase()} srcLang={subtitleLang} default />
          ) : null}
        </video>
      )}

      {/* FREE PLAYER (iframe embed) */}
      {sourceMode === "free" && activeFreeUrl && (
        <iframe
          src={activeFreeUrl}
          allowFullScreen
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="origin"
        />
      )}

      {/* Buffering spinner (premium only) */}
      {sourceMode === "premium" && buffering && (
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
          {/* Source mode toggle (iOS only) */}
          {iosDetected && (
            <div className="flex rounded bg-black/50 overflow-hidden border border-white/10">
              <button
                onClick={() => setSourceMode("free")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] transition ${sourceMode === "free" ? "bg-amber-500 text-black font-medium" : "text-white/60 hover:text-white"}`}
              >
                <Globe size={10} /> Free
              </button>
              <button
                onClick={() => setSourceMode("premium")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] transition ${sourceMode === "premium" ? "bg-amber-500 text-black font-medium" : "text-white/60 hover:text-white"}`}
              >
                <Crown size={10} /> RD
              </button>
            </div>
          )}
          {sourceMode === "premium" && (
            <button
              onClick={() => setSubtitleOn((v) => !v)}
              className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
            >
              {subtitleOn ? "CC: ON" : "CC: OFF"}
            </button>
          )}
        </div>
      </div>

      {/* Error toast */}
      {playerError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
          <div className="rounded bg-red-500/90 px-4 py-2 text-xs text-white">{playerError}</div>
        </div>
      )}

      {/* Bottom controls (premium only) */}
      {sourceMode === "premium" && (
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
                  {orchestrator.scoredStreams.slice(0, 5).map((stream, i) => {
                    const label = stream.title.includes("2160p") || stream.title.includes("4K")
                      ? "4K"
                      : stream.title.includes("1080p")
                      ? "1080p"
                      : stream.title.includes("720p")
                      ? "720p"
                      : "SD";
                    const containerBadge = stream.container && stream.container !== "unknown"
                      ? stream.container.toUpperCase()
                      : null;
                    return (
                      <button
                        key={stream.infoHash}
                        onClick={() => void handleQualityChange(i)}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          i === activeIndex ? "border-amber-500 text-amber-400" : "border-white/20 text-white/50 hover:border-white/40"
                        }`}
                        title={stream.title}
                      >
                        {label}{containerBadge ? ` · ${containerBadge}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={toggleFullscreen} className="rounded p-2 hover:bg-white/10">
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free source switcher (bottom bar for free mode) */}
      {sourceMode === "free" && freeSources.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-8">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Source</span>
            {freeSources.map((src, i) => (
              <button
                key={src.name}
                onClick={() => switchFreeSource(i)}
                className={`rounded px-3 py-1 text-xs transition ${
                  i === activeFreeIndex
                    ? "bg-amber-500 text-black font-medium"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {src.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/30">Free streaming sources may show ads</p>
        </div>
      )}

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
              <button onClick={() => setShowNextPrompt(false)} className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
