import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addMagnet, selectTorrentFiles, unrestrictLink, waitForTorrentReady, getTorrentInfo, buildMagnet } from "@/lib/debrid/real-debrid-client";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { infoHash, userId, torrentId: existingTorrentId, title } = body;

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

    const magnet = buildMagnet(infoHash, title);
    let torrentId = existingTorrentId;

    // Step 1: Add magnet (if no existing torrentId)
    if (!torrentId) {
      try {
        const added = await addMagnet(token, magnet);
        torrentId = added.id;
      } catch (e: any) {
        return NextResponse.json({ error: `addMagnet failed: ${e.message}` }, { status: 502 });
      }

      // Step 2: Select files
      try {
        await selectTorrentFiles(token, torrentId, "all");
      } catch {
        // ignore — may already be selected
      }
    }

    // Step 3: Check current status
    let info;
    try {
      info = await getTorrentInfo(token, torrentId);
    } catch (e: any) {
      return NextResponse.json({ error: `getInfo failed: ${e.message}` }, { status: 502 });
    }

    // If already downloaded, unrestrict immediately
    if (info.status === "downloaded" && Array.isArray(info.links) && info.links.length > 0) {
      const unrestricted = await unrestrictLink(token, info.links[0]);
      return NextResponse.json({
        playableUrl: unrestricted.download,
        filename: unrestricted.filename || info.filename,
        torrentId,
        status: "ready",
      });
    }

    // If error/virus/dead
    if (["error", "virus", "dead"].includes(info.status)) {
      return NextResponse.json({ error: `Torrent failed: ${info.status}`, torrentId, status: info.status }, { status: 502 });
    }

    // If still processing, return pending so client can poll
    if (["magnet_conversion", "queued", "downloading", "compressing", "uploading", "waiting_files_selection"].includes(info.status)) {
      return NextResponse.json({
        pending: true,
        status: info.status,
        progress: info.progress || 0,
        torrentId,
        message: `Preparing stream... (${info.status})`,
      }, { status: 202 });
    }

    // Unknown status — try waiting briefly
    try {
      info = await waitForTorrentReady(token, torrentId, 8, 1500);
    } catch {
      return NextResponse.json({
        pending: true,
        status: info.status,
        progress: info.progress || 0,
        torrentId,
        message: `Preparing stream... (${info.status})`,
      }, { status: 202 });
    }

    if (Array.isArray(info.links) && info.links.length > 0) {
      const unrestricted = await unrestrictLink(token, info.links[0]);
      return NextResponse.json({
        playableUrl: unrestricted.download,
        filename: unrestricted.filename || info.filename,
        torrentId,
        status: "ready",
      });
    }

    return NextResponse.json({ error: "No playable links", torrentId }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
