import { NextResponse } from "next/server";

export const runtime = "edge";

function toVtt(srt: string): string {
  const normalized = srt.replace(/\r/g, "").trim();
  const body = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body}\n`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const lang = searchParams.get("lang") || "ar";
  const mediaType = searchParams.get("mediaType") || "movie";
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");

  if (!tmdbId) return NextResponse.json({ error: "Missing tmdbId" }, { status: 400 });

  try {
    const params = new URLSearchParams({ tmdbId, lang, mediaType });
    if (season) params.set("season", season);
    if (episode) params.set("episode", episode);

    const locator = await fetch(`https://sub.wyzie.ru/search?${params.toString()}`);
    if (!locator.ok) throw new Error(`Subtitle index failed: ${locator.status}`);

    const payload = await locator.json();
    const list = Array.isArray(payload) ? payload : (payload.subtitles ?? []);
    const first = list[0];
    if (!first?.url) throw new Error("No subtitles found");

    const rawRes = await fetch(first.url);
    if (!rawRes.ok) throw new Error("Subtitle fetch failed");
    const raw = await rawRes.text();
    const vtt = toVtt(raw);

    return new NextResponse(vtt, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
