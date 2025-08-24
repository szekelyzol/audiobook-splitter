import { uploadToYoto } from "./yotoUpload";

export type Transcoded = {
  transcodedSha256: string;
  transcodedInfo?: {
    duration?: number;
    fileSize?: number;
    format?: string;
    channels?: number | "mono" | "stereo";
    metadata?: { title?: string };
  };
};

// --- Small helpers ---
function pad2(n: number | string): string {
  const s = String(n);
  return s.length < 2 ? "0" + s : s;
}

function asChannels(v: any): "mono" | "stereo" | undefined {
  if (v === 1 || v === "1" || v === "mono") return "mono";
  if (v === 2 || v === "2" || v === "stereo") return "stereo";
  return undefined;
}

// Deduplicate user-selected files by name+size+mtime
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

// Deduplicate transcoded results by their final content hash (transcodedSha256)
export function dedupeBySha<T extends { transcoded: { transcodedSha256: string } }>(results: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = 0; i < results.length; i++) {
    const sha = results[i].transcoded.transcodedSha256;
    if (!seen.has(sha)) {
      seen.add(sha);
      out.push(results[i]);
    }
  }
  return out;
}

// Upload many files in sequence to preserve order. Returns unique-by-SHA results.
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
  return dedupeBySha(results);
}

// Build Yoto track objects from upload results
export function buildTracksFrom(
  results: { file: File; transcoded: Transcoded }[],
  iconMediaId?: string
) {
  const tracks: any[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const info = r.transcoded.transcodedInfo || {};
    const title = (info && info.metadata && info.metadata.title) || r.file.name.replace(/\.[^.]+$/, "");
    const overlay = String(i + 1);
    const key = pad2(i + 1);
    const channels = asChannels((info as any).channels);
    const display = iconMediaId ? { icon16x16: `yoto:#${iconMediaId}` } : undefined;

    const track: any = {
      key,
      title,
      overlayLabel: overlay,
      trackUrl: `yoto:#${r.transcoded.transcodedSha256}`,
      duration: (info && info.duration) || 1,
      fileSize: (info && info.fileSize) || 1,
      format: (info && info.format) || "aac",
      type: "audio",
    };
    if (channels) track.channels = channels;
    if (display) track.display = display;

    tracks.push(track);
  }
  return tracks;
}

// Strictly sanitize a track object to only allowed keys
export function sanitizeTrack(t: any) {
  const out: any = {
    key: String(t.key ?? "01"),
    title: String(t.title ?? "Track"),
    overlayLabel: String(t.overlayLabel ?? "1"),
    trackUrl: String(t.trackUrl),
    duration: typeof t.duration === "number" ? t.duration : 1,
    fileSize: typeof t.fileSize === "number" ? t.fileSize : 1,
    format: String(t.format || "aac"),
    type: "audio",
  };
  const ch = asChannels(t.channels);
  if (ch) out.channels = ch;
  if (t?.display?.icon16x16) out.display = { icon16x16: String(t.display.icon16x16) };
  return out;
}

// Sanitize a chapter object
export function sanitizeChapter(c: any) {
  const tracksIn = Array.isArray(c.tracks) ? c.tracks : [];
  const tracksOut = new Array(tracksIn.length);
  for (let i = 0; i < tracksIn.length; i++) tracksOut[i] = sanitizeTrack(tracksIn[i]);
  const out: any = {
    key: String(c.key ?? "01"),
    title: String(c.title ?? ""),
    tracks: tracksOut,
  };
  if (c?.display?.icon16x16) out.display = { icon16x16: String(c.display.icon16x16) };
  return out;
}

// Merge newly uploaded tracks into an existing card's content (chapter 1)
export function mergeTracksIntoContent(
  existing: any,
  newTracks: any[],
  chapterIconMediaId?: string
) {
  const E = (existing && existing.card && existing.card.content) || existing?.content || {};
  const chaptersIn = Array.isArray(E.chapters) ? E.chapters : [];

  if (chaptersIn.length === 0) {
    const ch = sanitizeChapter({
      key: "01",
      title: E?.title || "",
      display: chapterIconMediaId ? { icon16x16: `yoto:#${chapterIconMediaId}` } : undefined,
      tracks: newTracks,
    });
    return { chapters: [ch], config: { resumeTimeout: 2592000 }, playbackType: "linear" };
  }

  const first = sanitizeChapter(chaptersIn[0]);
  if ((!first.display || !first.display.icon16x16) && chapterIconMediaId) {
    first.display = { ...(first.display || {}), icon16x16: `yoto:#${chapterIconMediaId}` };
  }

  const start = Array.isArray(first.tracks) ? first.tracks.length : 0;
  for (let i = 0; i < newTracks.length; i++) {
    const raw = { ...newTracks[i] };
    raw.key = pad2(start + i + 1);
    raw.overlayLabel = String(start + i + 1);
    first.tracks.push(sanitizeTrack(raw));
  }

  return {
    chapters: [first],
    config: { ...(E.config || {}), resumeTimeout: E?.config?.resumeTimeout ?? 2592000 },
    playbackType: E.playbackType || "linear",
  };
}
