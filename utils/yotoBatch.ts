import { uploadToYoto } from "./yotoUpload";

export type Transcoded = {
  transcodedSha256: string;
  transcodedInfo?: {
    duration?: number;
    fileSize?: number;
    format?: string;
    channels?: number;
    metadata?: { title?: string };
  };
};

// --- Utilities ---
export function dedupeFiles(files: File[]): File[] {
  const seen: { [k: string]: true } = {};
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const key = (f.name || "") + "::" + String(f.size) + "::" + String((f as any).lastModified || 0);
    if (!seen[key]) {
      seen[key] = true;
      out.push(f);
    }
  }
  return out;
}

function asChannels(v: any): "mono" | "stereo" | undefined {
  if (v === 1 || v === "1" || v === "mono") return "mono";
  if (v === 2 || v === "2" || v === "stereo") return "stereo";
  return undefined;
}

export function sanitizeTrack(t: any) {
  const channels = asChannels(t.channels);
  const display = t?.display && t.display.icon16x16 ? { icon16x16: String(t.display.icon16x16) } : undefined;
  return {
    key: String(t.key ?? "01"),
    title: String(t.title ?? "Track"),
    overlayLabel: String(t.overlayLabel ?? "1"),
    trackUrl: String(t.trackUrl),
    duration: typeof t.duration === "number" ? t.duration : 1,
    fileSize: typeof t.fileSize === "number" ? t.fileSize : 1,
    format: String(t.format || "aac"),
    type: "audio" as const,
    ...(channels ? { channels } : {}),
    ...(display ? { display } : {}),
  };
}

export function sanitizeChapter(c: any) {
  const display = c?.display && c.display.icon16x16 ? { icon16x16: String(c.display.icon16x16) } : undefined;
  const tracksIn = Array.isArray(c.tracks) ? c.tracks : [];
  const tracksOut = new Array(tracksIn.length);
  for (let i = 0; i < tracksIn.length; i++) {
    tracksOut[i] = sanitizeTrack(tracksIn[i]);
  }
  const out: any = {
    key: String(c.key ?? "01"),
    title: String(c.title ?? ""),
    tracks: tracksOut,
  };
  if (display) out.display = display;
  return out;
}

// --- Batch upload flow ---
export async function uploadManySequential(
  files: File[],
  onProgress?: (i: number, total: number) => void
) {
  const uniques = dedupeFiles(files);
  const results: { file: File; transcoded: Transcoded }[] = [];
  for (let i = 0; i < uniques.length; i++) {
    onProgress?.(i + 1, uniques.length);
    const { transcoded } = await uploadToYoto(uniques[i]);
    results.push({ file: uniques[i], transcoded });
  }
  return results;
}

export function buildTracksFrom(
  results: { file: File; transcoded: Transcoded }[],
  iconMediaId?: string
) {
  const tracks = new Array(results.length);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const info = r.transcoded.transcodedInfo || {};
    const title = (info && info.metadata && info.metadata.title) || r.file.name.replace(/\.[^.]+$/, "");
    const overlay = String(i + 1);
    const key = (i + 1).toString().padStart(2, "0");
    const channels = asChannels(info && (info as any).channels);
    const display = iconMediaId ? { icon16x16: `yoto:#${iconMediaId}` } : undefined;
    const tr = {
      key,
      title,
      overlayLabel: overlay,
      trackUrl: `yoto:#${r.transcoded.transcodedSha256}`,
      duration: (info && info.duration) || 1,
      fileSize: (info && info.fileSize) || 1,
      format: (info && info.format) || "aac",
      type: "audio",
      ...(channels ? { channels } : {}),
      ...(display ? { display } : {}),
    };
    tracks[i] = tr;
  }
  return tracks;
}

export function mergeTracksIntoContent(
  existing: any,
  newTracks: any[],
  chapterIconMediaId?: string
) {
  const content = (existing && (existing.card && existing.card.content)) || existing?.content || {};
  const chaptersIn = Array.isArray(content.chapters) ? content.chapters : [];

  if (chaptersIn.length === 0) {
    const chapter = sanitizeChapter({
      key: "01",
      title: (content && content.title) || "",
      display: chapterIconMediaId ? { icon16x16: `yoto:#${chapterIconMediaId}` } : undefined,
      tracks: newTracks,
    });
    return {
      chapters: [chapter],
      config: { resumeTimeout: 2592000 },
      playbackType: "linear",
    };
  }

  // Sanitize the first chapter and append
  const first = sanitizeChapter(chaptersIn[0]);
  const startIdx = Array.isArray(first.tracks) ? first.tracks.length : 0;
  const appended = new Array(newTracks.length);
  for (let i = 0; i < newTracks.length; i++) {
    const tr = { ...newTracks[i] };
    tr.key = (startIdx + i + 1).toString().padStart(2, "0");
    tr.overlayLabel = String(startIdx + i + 1);
    appended[i] = sanitizeTrack(tr);
  }
  if ((!first.display || !first.display.icon16x16) && chapterIconMediaId) {
    first.display = { ...(first.display || {}), icon16x16: `yoto:#${chapterIconMediaId}` };
  }
  first.tracks = [...(first.tracks || []), ...appended];

  const chaptersOut = chaptersIn.slice();
  chaptersOut[0] = first;

  return {
    chapters: chaptersOut,
    config: { ...(content.config || {}), resumeTimeout: content?.config?.resumeTimeout ?? 2592000 },
    playbackType: content.playbackType || "linear",
  };
}
