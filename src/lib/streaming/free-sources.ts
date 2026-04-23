// Free iframe embed sources for iOS fallback
// These load external players that handle any format (including MKV)

export interface FreeEmbedSource {
  name: string;
  url: string;
}

export function buildFreeEmbedUrls(params: {
  tmdbId: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}): FreeEmbedSource[] {
  const { tmdbId, mediaType, season, episode } = params;
  const sources: FreeEmbedSource[] = [];

  if (mediaType === "movie") {
    // VidSrc.to — most reliable, auto-updating sources
    sources.push({
      name: "VidSrc",
      url: `https://vidsrc.to/embed/movie/${tmdbId}`,
    });
    // 2Embed — backup source
    sources.push({
      name: "2Embed",
      url: `https://www.2embed.cc/embed/${tmdbId}`,
    });
  } else {
    // TV show
    const s = season ?? 1;
    const e = episode ?? 1;
    sources.push({
      name: "VidSrc",
      url: `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`,
    });
    sources.push({
      name: "2Embed",
      url: `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`,
    });
  }

  return sources;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}
