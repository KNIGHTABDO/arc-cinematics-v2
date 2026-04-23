import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkTorrentCached,
  unrestrictLink,
  waitForTorrentReady,
  getTorrentInfo,
  deleteTorrent,
} from "@/lib/debrid/real-debrid-client";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { infoHash, userId, torrentId: existingTorrentId, title, mode } = body;

    if (!infoHash || !/^[a-fA-F0-9]{40}$/.test(infoHash)) {
      return NextResponse.json({ error: "Invalid infoHash" }, { status: 400 });
    }

    let token: string | null = null;

    if (userId) {
      try {
        const { data } = await supabase
          .from("user_preferences")
          .select("real_debrid_api_key")
          .eq("user_id", userId)
          .single();
        if (data?.real_debrid_api_key) token = data.real_debrid_api_key;
      } catch {
        // ignore — fall back to env token
      }
    }

    if (!token) {
      token = process.env.REAL_DEBRID_TOKEN || process.env.VITE_REAL_DEBRID_TOKEN || null;
    }

    if (!token) {
      return NextResponse.json({ error: "Missing Real-Debrid token" }, { status: 401 });
    }

    const magnet = `magnet:?xt=urn:btih:${infoHash}`;

    // MODE 1: rapid cache check (default)
    // Add magnet, poll briefly, if not cached → return notCached so client tries next stream
    if (mode !== "poll") {
      const result = await checkTorrentCached(token, magnet, 12);

      if (result.cached) {
        const unrestricted = await unrestrictLink(token, result.info.links[0]);
        return NextResponse.json({
          playableUrl: unrestricted.download,
          filename: unrestricted.filename || result.info.filename,
          torrentId: result.torrentId,
          status: "ready",
        });
      }

      return NextResponse.json({
        notCached: true,
        message: "This torrent is not cached on Real-Debrid. Trying next stream...",
      }, { status: 202 });
    }

    // MODE 2: long poll (for when user explicitly wants to wait for a specific torrent)
    // Only used when client passes mode="poll" + existingTorrentId
    if (!existingTorrentId) {
      return NextResponse.json({ error: "poll mode requires torrentId" }, { status: 400 });
    }

    const info = await getTorrentInfo(token, existingTorrentId);

    if (info.status === "downloaded" && Array.isArray(info.links) && info.links.length > 0) {
      const unrestricted = await unrestrictLink(token, info.links[0]);
      return NextResponse.json({
        playableUrl: unrestricted.download,
        filename: unrestricted.filename || info.filename,
        torrentId: existingTorrentId,
        status: "ready",
      });
    }

    if (["error", "virus", "dead"].includes(info.status)) {
      return NextResponse.json({ error: `Torrent failed: ${info.status}` }, { status: 502 });
    }

    return NextResponse.json({
      pending: true,
      status: info.status,
      progress: info.progress || 0,
      torrentId: existingTorrentId,
      message: `Preparing stream... (${info.status})`,
    }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
