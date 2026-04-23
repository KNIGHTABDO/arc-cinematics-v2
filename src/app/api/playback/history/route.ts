import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType") || "movie";
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");

  if (!userId || !tmdbId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  let query = supabase
    .from("playback_history")
    .select("timestamp_seconds, duration_seconds, completed")
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);

  if (season) query = query.eq("season_number", Number(season));
  if (episode) query = query.eq("episode_number", Number(episode));

  const { data } = await query.maybeSingle();
  return NextResponse.json(data || { timestamp_seconds: 0 });
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json();
    const {
      userId, tmdbId, mediaType,
      seasonNumber, episodeNumber,
      timestampSeconds, durationSeconds, completed,
    } = body;

    if (!userId || !tmdbId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const payload: Record<string, any> = {
      user_id: userId,
      tmdb_id: tmdbId,
      media_type: mediaType || "movie",
      timestamp_seconds: timestampSeconds || 0,
      duration_seconds: durationSeconds || 0,
      completed: !!completed,
      updated_at: new Date().toISOString(),
    };
    if (seasonNumber !== undefined) payload.season_number = seasonNumber;
    if (episodeNumber !== undefined) payload.episode_number = episodeNumber;

    await supabase.from("playback_history").upsert(payload, {
      onConflict: "user_id,tmdb_id,season_number,episode_number",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
