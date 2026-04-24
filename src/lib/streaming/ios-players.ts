// iOS Native Player URL Schemes
// Opens Real-Debrid streams in Infuse or VLC for MKV/AC3/DTS support

export interface IOSPlayerOption {
  id: "infuse" | "vlc" | "rd" | "free";
  name: string;
  description: string;
  icon: string;
  recommended: boolean;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export function isIPad(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  return /iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isIPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/.test(navigator.userAgent);
}

export function buildInfuseUrl(params: {
  videoUrl: string;
  subtitleUrl?: string;
  returnUrl?: string;
}): string {
  const { videoUrl, subtitleUrl, returnUrl } = params;
  const query = new URLSearchParams();
  query.set("url", videoUrl);
  if (subtitleUrl) query.set("sub", subtitleUrl);
  if (returnUrl) {
    query.set("x-success", returnUrl);
    query.set("x-error", returnUrl);
  }
  return `infuse://x-callback-url/play?${query.toString()}`;
}

export function buildVLCUrl(params: {
  videoUrl: string;
  returnUrl?: string;
}): string {
  const { videoUrl, returnUrl } = params;
  const query = new URLSearchParams();
  query.set("url", videoUrl);
  if (returnUrl) {
    query.set("x-success", returnUrl);
    query.set("x-error", returnUrl);
  }
  return `vlc-x-callback://x-callback-url/stream?${query.toString()}`;
}

export function buildInfuseDeepLink(params: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}): string {
  const { tmdbId, mediaType, season, episode } = params;
  if (mediaType === "movie") {
    return `infuse://movie/${tmdbId}`;
  }
  if (season !== undefined && episode !== undefined) {
    return `infuse://series/${tmdbId}-${season}-${episode}`;
  }
  if (season !== undefined) {
    return `infuse://series/${tmdbId}-${season}`;
  }
  return `infuse://series/${tmdbId}`;
}

export function openInfuse(videoUrl: string, subtitleUrl?: string, returnUrl?: string) {
  const url = buildInfuseUrl({ videoUrl, subtitleUrl, returnUrl });
  window.location.href = url;
}

export function openVLC(videoUrl: string, returnUrl?: string) {
  const url = buildVLCUrl({ videoUrl, returnUrl });
  window.location.href = url;
}

export function getPlayerOptions(filename?: string): IOSPlayerOption[] {
  const isMkv = filename?.toLowerCase().endsWith(".mkv");
  const hasIncompatibleAudio = filename ? /ac3|dts|eac3|truehd/i.test(filename) : false;
  const needsNativePlayer = isMkv || hasIncompatibleAudio;

  return [
    {
      id: "infuse",
      name: "Open in Infuse",
      description: needsNativePlayer
        ? "Recommended for this file — plays MKV, AC3, DTS"
        : "Best iOS player with subtitles & resume",
      icon: "🎬",
      recommended: needsNativePlayer || true,
    },
    {
      id: "vlc",
      name: "Open in VLC",
      description: "Free alternative, supports any format",
      icon: "🎥",
      recommended: false,
    },
    {
      id: "rd",
      name: "Real-Debrid Player",
      description: needsNativePlayer
        ? "May not work — file needs native player"
        : "Our built-in player with subtitles",
      icon: "👑",
      recommended: !needsNativePlayer,
    },
    {
      id: "free",
      name: "Watch Free",
      description: "In-browser stream (may have ads)",
      icon: "🌐",
      recommended: false,
    },
  ];
}
