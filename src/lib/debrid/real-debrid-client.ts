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
  progress?: number;
  hash?: string;
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
  // v1 used URLSearchParams and it worked — keep it
  const body = new URLSearchParams({ magnet });
  return rdFetch<{ id: string }>("/torrents/addMagnet", token, {
    method: "POST",
    body,
  });
}

export async function deleteTorrent(token: string, torrentId: string): Promise<void> {
  try {
    await rdFetch(`/torrents/delete/${torrentId}`, token, {
      method: "DELETE",
    });
  } catch {
    // best-effort cleanup
  }
}

export async function selectTorrentFiles(token: string, torrentId: string, files = "all"): Promise<unknown> {
  const body = new URLSearchParams({ files });
  return rdFetch(`/torrents/selectFiles/${torrentId}`, token, {
    method: "POST",
    body,
  });
}

export async function getTorrentInfo(token: string, torrentId: string): Promise<RealDebridTorrentInfo> {
  return rdFetch<RealDebridTorrentInfo>(`/torrents/info/${torrentId}`, token);
}

export async function unrestrictLink(token: string, link: string): Promise<{ download: string; filename?: string }> {
  const body = new URLSearchParams({ link });
  return rdFetch<{ download: string; filename?: string }>("/unrestrict/link", token, {
    method: "POST",
    body,
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

/**
 * Quick cache check: add magnet, select files, poll briefly.
 * Returns { cached: true, info } if downloaded quickly.
 * Returns { cached: false } if not cached (deletes the torrent).
 */
export async function checkTorrentCached(
  token: string,
  magnet: string,
  pollSeconds = 12,
): Promise<{ cached: true; info: RealDebridTorrentInfo; torrentId: string } | { cached: false; torrentId?: string }> {
  const added = await addMagnet(token, magnet);
  const torrentId = added.id;

  try {
    await selectTorrentFiles(token, torrentId, "all");
  } catch {
    // may already be selected
  }

  const start = Date.now();
  const intervalMs = 1500;
  const maxAttempts = Math.max(3, Math.floor((pollSeconds * 1000) / intervalMs));

  for (let i = 0; i < maxAttempts; i++) {
    const info = await getTorrentInfo(token, torrentId);

    if (info.status === "downloaded" && Array.isArray(info.links) && info.links.length > 0) {
      return { cached: true, info, torrentId };
    }

    if (["error", "virus", "dead", "magnet_error"].includes(info.status)) {
      await deleteTorrent(token, torrentId);
      return { cached: false };
    }

    // If progress stays at 0 for multiple checks, it's likely dead/uncached
    if (i >= 4 && (info.progress || 0) === 0 && info.status === "downloading") {
      await deleteTorrent(token, torrentId);
      return { cached: false };
    }

    const elapsed = Date.now() - start;
    if (elapsed >= pollSeconds * 1000) {
      break;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Not cached in time — delete to avoid cluttering user's RD account
  await deleteTorrent(token, torrentId);
  return { cached: false };
}
