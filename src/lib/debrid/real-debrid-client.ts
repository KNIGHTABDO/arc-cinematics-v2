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
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function addMagnet(token: string, magnet: string): Promise<{ id: string }> {
  const body = new URLSearchParams({ magnet });
  return rdFetch<{ id: string }>("/torrents/addMagnet", token, { method: "POST", body });
}

export async function selectTorrentFiles(token: string, torrentId: string, files = "all"): Promise<unknown> {
  const body = new URLSearchParams({ files });
  return rdFetch(`/torrents/selectFiles/${torrentId}`, token, { method: "POST", body });
}

export async function getTorrentInfo(token: string, torrentId: string): Promise<RealDebridTorrentInfo> {
  return rdFetch<RealDebridTorrentInfo>(`/torrents/info/${torrentId}`, token);
}

export async function unrestrictLink(token: string, link: string): Promise<{ download: string; filename?: string }> {
  const body = new URLSearchParams({ link });
  return rdFetch<{ download: string; filename?: string }>("/unrestrict/link", token, { method: "POST", body });
}

export async function waitForTorrentReady(
  token: string,
  torrentId: string,
  maxAttempts = 25,
  intervalMs = 2000,
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
