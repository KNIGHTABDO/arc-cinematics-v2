import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StreamScoringEngine } from "@/lib/playback/scoring-engine";
import type { TorrentStream } from "@/lib/playback/scoring-engine";

export const runtime = "edge";
export const maxDuration = 60;

type TPBTorrent = {
  id: string;
  name: string;
  info_hash: string;
  size: string;
  seeders: string;
  leechers: string;
  imdb?: string;
  category?: string;
};

function normalizeStreams(raw: TPBTorrent[]): TorrentStream[] {
  return raw
    .map((item) => {
      const infoHash = item.info_hash?.trim().toLowerCase();
      if (!infoHash || infoHash.length !== 40) return null;
      if (!/^[a-f0-9]{40}$/.test(infoHash)) return null;
      if (infoHash === "0".repeat(40)) return null; // reject fake all-zero hashes
      const seeders = Number(item.seeders || 0);
      if (seeders <= 0) return null; // reject dead torrents
      return {
        title: item.name || `Stream ${infoHash.slice(0, 8)}`,
        infoHash,
        sizeBytes: Number(item.size || 0),
        seeders,
        source: "thepiratebay",
      } as TorrentStream;
    })
    .filter(Boolean) as TorrentStream[];
}

function getCapabilities(userAgent?: string, acceptLanguage?: string) {
  const ua = (userAgent || "").toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(ua);
  const supportsHEVC = /safari|iphone|ipad|macintosh/.test(ua);
  const preferredLanguage = (acceptLanguage || "en").split(",")[0]?.split("-")[0] || "en";
  return { isIOS, supportsHEVC, preferredLanguage };
}

async function fetchTMDBDetails(tmdbId: string, type: string): Promise<{ title?: string; year?: string; name?: string }> {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
  try {
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${key}&language=en-US`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    const data = await res.json();
    if (type === "movie") {
      return { title: data.title, year: data.release_date?.slice(0, 4) };
    }
    return { name: data.name };
  } catch {
    return {};
  }
}

async function fetchTPB(query: string, cat: string): Promise<TPBTorrent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=${cat}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");
  const userAgent = req.headers.get("user-agent") || "";
  const acceptLanguage = req.headers.get("accept-language") || "";

  if (!tmdbId) return NextResponse.json({ error: "Missing TMDB ID" }, { status: 400 });

  // 1. Get title from TMDB
  const details = await fetchTMDBDetails(tmdbId, type);
  if (!details.title && !details.name) {
    return NextResponse.json({ error: "Could not resolve title from TMDB" }, { status: 502 });
  }

  // 2. Try cache first
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    let query = supabase
      .from("streams_cache")
      .select("raw_results")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", type)
      .gt("expires_at", new Date().toISOString());

    if (season) query = query.eq("season_number", Number(season));
    if (episode) query = query.eq("episode_number", Number(episode));

    const { data: cached } = await query.limit(1).maybeSingle();
    if (cached?.raw_results && Array.isArray(cached.raw_results) && cached.raw_results.length > 0) {
      return NextResponse.json({ source: "cache", streams: cached.raw_results });
    }
  } catch {
    // cache miss — proceed
  }

  // 3. Search TPB
  let raw: TPBTorrent[] = [];
  if (type === "movie") {
    const q = details.year ? `${details.title} ${details.year}` : details.title!;
    raw = await fetchTPB(q, "201"); // Movies
    if (raw.length === 0) raw = await fetchTPB(q, "200"); // All video fallback
  } else {
    const q = season !== undefined && episode !== undefined
      ? `${details.name} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : details.name!;
    raw = await fetchTPB(q, "205"); // TV
    if (raw.length === 0) raw = await fetchTPB(q, "200"); // All video fallback
  }

  const normalized = normalizeStreams(raw);
  const scored = StreamScoringEngine.rankStreams(normalized, getCapabilities(userAgent, acceptLanguage)).slice(0, 20);

  // 4. Save to cache
  if (scored.length > 0) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const insertPayload: Record<string, unknown> = {
        tmdb_id: tmdbId,
        media_type: type,
        raw_results: scored,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      };
      if (season) insertPayload.season_number = Number(season);
      if (episode) insertPayload.episode_number = Number(episode);
      void supabase.from("streams_cache").upsert(insertPayload, {
        onConflict: "tmdb_id,media_type,season_number,episode_number",
      });
    } catch {
      // ignore
    }
  }

  if (scored.length === 0) {
    return NextResponse.json({ error: "No streams found. Try again later." }, { status: 404 });
  }

  return NextResponse.json({ source: "thepiratebay", streams: scored });
}
