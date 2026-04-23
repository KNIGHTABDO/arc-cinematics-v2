export interface RealDebridTorrentInfoFile {
  id: number;
  path: string;
  bytes: number;
  selected?: number;
}

export interface RealDebridTorrentInfo {
  id: string;
  status: string;
  filename: string;
  files: RealDebridTorrentInfoFile[];
  links: string[];
}

const RD_BASE = "https://api.real-debrid.com/rest/1.0";

function withAuth(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function rdFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
  timeoutMs = 12000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${RD_BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), ...withAuth(token) },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Real-Debrid ${res.status}: ${text || res.statusText}`);
    }
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function addMagnet(token: string, magnet: string): Promise<{ id: string }> {
  // Only encode '=' in magnet to prevent form parsing issues
  // RD rejects fully URL-encoded magnets (: and ? must stay raw)
  const body = `magnet=${magnet.replace(/=/g, "%3D")}`;
  return rdFetch<{ id: string }>("/torrents/addMagnet", token, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export function buildMagnet(infoHash: string, name?: string): string {
  const trackers = [
    "udp://tracker.openbittorrent.com:80/announce",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://tracker.coppersurfer.tk:6969/announce",
  ];
  let magnet = `magnet:?xt=urn:btih:${infoHash}`;
  if (name) {
    magnet += `&dn=${encodeURIComponent(name)}`;
  }
  for (const tr of trackers) {
    magnet += `&tr=${encodeURIComponent(tr)}`;
  }
  return magnet;
}

export async function selectTorrentFiles(token: string, torrentId: string, files = "all"): Promise<unknown> {
  const body = `files=${files}`;
  return rdFetch(`/torrents/selectFiles/${torrentId}`, token, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function getTorrentInfo(token: string, torrentId: string): Promise<RealDebridTorrentInfo> {
  return rdFetch<RealDebridTorrentInfo>(`/torrents/info/${torrentId}`, token);
}

export async function unrestrictLink(token: string, link: string): Promise<{ download: string; filename?: string }> {
  const body = `link=${link}`;
  return rdFetch<{ download: string; filename?: string }>("/unrestrict/link", token, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function waitForTorrentReady(
  token: string,
  torrentId: string,
  maxAttempts = 10,
  intervalMs = 1500,
): Promise<RealDebridTorrentInfo> {
  let last: RealDebridTorrentInfo | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const info = await getTorrentInfo(token, torrentId);
    last = info;
    if (info.links?.length > 0) return info;
    if (["error", "virus", "dead"].includes(info.status)) {
      throw new Error(`Torrent unavailable: ${info.status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Torrent not ready in time. Last status: ${last?.status || "unknown"}`);
}
