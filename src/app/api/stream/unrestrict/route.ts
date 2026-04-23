import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addMagnet, selectTorrentFiles, unrestrictLink, waitForTorrentReady } from "@/lib/debrid/real-debrid-client";

export const runtime = "edge";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { infoHash, userId } = body;

    if (!infoHash || !/^[a-fA-F0-9]{40}$/.test(infoHash)) {
      return NextResponse.json({ error: "Invalid infoHash" }, { status: 400 });
    }

    let token: string | null = null;

    if (userId) {
      const { data } = await supabase
        .from("user_preferences")
        .select("real_debrid_api_key")
        .eq("user_id", userId)
        .single();
      if (data?.real_debrid_api_key) token = data.real_debrid_api_key;
    }

    if (!token) {
      token = process.env.REAL_DEBRID_TOKEN || process.env.VITE_REAL_DEBRID_TOKEN || null;
    }

    if (!token) {
      return NextResponse.json({ error: "Missing Real-Debrid token" }, { status: 401 });
    }

    const magnet = `magnet:?xt=urn:btih:${infoHash}`;
    const added = await addMagnet(token, magnet);
    await selectTorrentFiles(token, added.id, "all");
    const info = await waitForTorrentReady(token, added.id);

    if (!Array.isArray(info.links) || info.links.length === 0) {
      return NextResponse.json({ error: "No playable links returned" }, { status: 502 });
    }

    const unrestricted = await unrestrictLink(token, info.links[0]);
    return NextResponse.json({ playableUrl: unrestricted.download, filename: unrestricted.filename || info.filename });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
