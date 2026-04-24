// Oracle OCI Remux Proxy — MKV→MP4 for iOS Safari
// Routes Real-Debrid links through ffmpeg remux (H.264 copy + AAC)

const REMUX_PROXY_URL =
  process.env.NEXT_PUBLIC_REMUX_PROXY_URL ||
  "https://nutritional-functional-traveller-kelkoo.trycloudflare.com";

export function getRemuxUrl(rawVideoUrl: string): string {
  if (!rawVideoUrl || !rawVideoUrl.startsWith("http")) return rawVideoUrl;
  const proxy = REMUX_PROXY_URL.replace(/\/$/, "");
  return `${proxy}/remux?url=${encodeURIComponent(rawVideoUrl)}`;
}

export function isRemuxNeeded(filename?: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  const isMkv = lower.endsWith(".mkv");
  const hasIncompatibleAudio = /ac3|dts|eac3|truehd/i.test(lower);
  return isMkv || hasIncompatibleAudio;
}

export function isSafariiOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}
