export interface TorrentStream {
  title: string;
  infoHash: string;
  sizeBytes: number;
  seeders: number;
  source?: string;
  score?: number;
}

export interface ClientCapabilities {
  isIOS: boolean;
  supportsHEVC: boolean;
  preferredLanguage: string;
}

export class StreamScoringEngine {
  private static readonly HEVC_REGEX = /x265|hevc|h265|hvc1/i;
  private static readonly REMUX_REGEX = /remux|bluray/i;
  private static readonly MP4_REGEX = /\.mp4/i;
  private static readonly ATMOS_71_REGEX = /7\.1|atmos|truehd/i;
  private static readonly SURROUND_51_REGEX = /5\.1|dts|ddp/i;

  public static rankStreams(streams: TorrentStream[], capabilities: ClientCapabilities): TorrentStream[] {
    return streams
      .map((stream) => ({ ...stream, score: this.calculateScore(stream, capabilities) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private static calculateScore(stream: TorrentStream, capabilities: ClientCapabilities): number {
    let score = 0;
    const title = stream.title;

    if (/2160p|4k/i.test(title)) score += 30;
    else if (/1080p/i.test(title)) score += 20;
    else if (/720p/i.test(title)) score += 10;

    if (this.REMUX_REGEX.test(title)) score += 15;
    else if (/web-dl|webrip/i.test(title)) score += 10;
    else if (/cam|ts|hdcam/i.test(title)) score -= 50;

    const isHEVC = this.HEVC_REGEX.test(title);
    if (isHEVC && capabilities.supportsHEVC) score += 15;
    else if (/x264|h264|avc/i.test(title)) score += 10;

    if (this.ATMOS_71_REGEX.test(title)) score += 15;
    else if (this.SURROUND_51_REGEX.test(title)) score += 10;
    else score += 2;

    const prefLangRegex = new RegExp(
      `${capabilities.preferredLanguage}|multi|dual|arabic|english`,
      "i",
    );
    const subsRegex = new RegExp(`${capabilities.preferredLanguage}-subs|subbed|multi-subs`, "i");

    if (prefLangRegex.test(title)) score += 20;
    if (subsRegex.test(title)) score += 15;

    if (stream.sizeBytes > 20_000_000_000) score += 10;
    else if (stream.sizeBytes > 10_000_000_000) score += 5;
    else if (stream.sizeBytes < 2_000_000_000) score -= 15;

    if (capabilities.isIOS) {
      if (!this.MP4_REGEX.test(title)) {
        score *= 0.1;
      } else if (isHEVC) {
        score *= 1.2;
      }
    }

    score += Math.min(15, Math.log10((stream.seeders || 0) + 1) * 5);
    return Math.round(score);
  }
}
