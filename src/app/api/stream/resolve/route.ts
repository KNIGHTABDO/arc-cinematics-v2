import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StreamScoringEngine } from "@/lib/playback/scoring-engine";
import type { TorrentStream } from "@/lib/playback/scoring-engine";

export const runtime = "edge";
export const maxDuration = 60;

type TorrentioStream = {
  title?: string;
  name?: string;
  infoHash?: string;
  infoHashHex?: string;
  size?: number;
  seeders?: number;
};

function normalizeInfoHash(value: string): string {
  return value.trim().toLowerCase();
}

function parseInfoHash(input: TorrentioStream): string | null {
  const direct = input.infoHash || input.infoHashHex;
  if (direct && /^[a-f0-9]{40}$/i.test(direct)) return normalizeInfoHash(direct);
  const txt = `${input.title || ""} ${input.name || ""}`;
  const m = txt.match(/[a-f0-9]{40}/i);
  return m ? normalizeInfoHash(m[0]) : null;
}

function normalizeStreams(payload: { streams?: TorrentioStream[] }): TorrentStream[] {
  const raw = Array.isArray(payload?.streams) ? payload.streams : [];
  return raw
    .map((item) => {
      const infoHash = parseInfoHash(item);
      if (!infoHash) return null;
      return {
        title: item.title || item.name || `Stream ${infoHash.slice(0, 8)}`,
        infoHash,
        sizeBytes: Number(item.size || 0),
        seeders: Number(item.seeders || 0),
        source: "torrentio",
      } as TorrentStream;
    })
    .filter(Boolean) as TorrentStream[];
}

function buildTorrentioUrl(type: string, tmdbId: string, season?: number, episode?: number): string {
  if (type === "tv" && season !== undefined && episode !== undefined) {
    return `https://torrentio.strem.fun/stream/series/${tmdbId}:${season}:${episode}.json`;
  }
  return `https://torrentio.strem.fun/stream/${type}/${tmdbId}.json`;
}

function getCapabilities(userAgent?: string, acceptLanguage?: string) {
  const ua = (userAgent || "").toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(ua);
  const supportsHEVC = /safari|iphone|ipad|macintosh/.test(ua);
  const preferredLanguage = (acceptLanguage || "en").split(",")[0]?.split("-")[0] || "en";
  return { isIOS, supportsHEVC, preferredLanguage };
}

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");
  const userAgent = req.headers.get("user-agent") || "";
  const acceptLanguage = req.headers.get("accept-language") || "";

  if (!tmdbId) return NextResponse.json({ error: "Missing TMDB ID" }, { status: 400 });

  try {
    let query = supabase
      .from("streams_cache")
      .select("raw_results")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", type)
      .gt("expires_at", new Date().toISOString());

    if (season) query = query.eq("season_number", Number(season));
    if (episode) query = query.eq("episode_number", Number(episode));

    const { data: cached } = await query.limit(1).maybeSingle();

    if (cached?.raw_results) {
      return NextResponse.json({ source: "cache", streams: cached.raw_results });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(
      buildTorrentioUrl(type, tmdbId, season ? Number(season) : undefined, episode ? Number(episode) : undefined),
      { headers: { Accept: "application/json" }, signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (!upstream.ok) throw new Error("Upstream resolution failed");
    const data = await upstream.json();
    const normalized = normalizeStreams(data);
    const scored = StreamScoringEngine.rankStreams(normalized, getCapabilities(userAgent, acceptLanguage)).slice(0, 20);

    if (scored.length > 0) {
      const insertPayload: Record<string, unknown> = {
        tmdb_id: tmdbId,
        media_type: type,
        raw_results: scored,
      };
      if (season) insertPayload.season_number = Number(season);
      if (episode) insertPayload.episode_number = Number(episode);
      void supabase.from("streams_cache").upsert(insertPayload, {
        onConflict: "tmdb_id,media_type,season_number,episode_number",
      });
    }

    return NextResponse.json({ source: "network", streams: scored });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
