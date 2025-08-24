// File: utils/yotoBatch.ts (icons via URL or yoto:#)
// Builders & sanitizers that mirror Yoto's web app payloads
// – One track per chapter
// – Chapter/track display.icon16x16 prefers full HTTPS icon URL for public icons
//   and falls back to `yoto:#<mediaId>` for user-uploaded images
// – Includes strict dedupe and merge helpers

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

// ---------- small utils ----------
function pad2(n: number): string { return n < 10 ? "0" + n : String(n); }

function asChannels(v: any): "mono" | "stereo" | undefined {
  if (v === 1 || v === "1" || v === "mono") return "mono";
  if (v === 2 || v === "2" || v === "stereo") return "stereo";
  return undefined;
}

export function dedupeFiles(files: File[]): File[] {
  const seen: { [k: string]: true } = {};
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const key = (f.name || "") + "::" + String(f.size) + "::" + String((f as any).lastModified || 0);
    if (!seen[key]) { seen[key] = true; out.push(f); }
  }
  return out;
}

export function dedupeBySha<T extends { transcoded: { transcodedSha256: string } }>(results: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = 0; i < results.length; i++) {
    const sha = results[i].transcoded.transcodedSha256;
    if (!seen.has(sha)) { seen.add(sha); out.push(results[i]); }
  }
  return out;
}

function dedupeTracksByUrl(tracks: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const url = String(tracks[i]?.trackUrl || "");
    if (!seen.has(url)) { seen.add(url); out.push(tracks[i]); }
  }
  return out;
}

// Prefer public icon URL when available; else fall back to yoto:# mediaId; allow null
function iconRef(mediaId?: string | null, url?: string | null) {
  return { icon16x16: url ?? (mediaId ? `yoto:#${mediaId}` : null) };
}

// Normalize any incoming icon string from existing content or input
function normalizeIcon(value: any, fallbackMediaId?: string | null, fallbackUrl?: string | null) {
  if (typeof value === "string" && value.length > 0) {
    const v = value.trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return { icon16x16: v };
    if (v.startsWith("yoto:#")) return { icon16x16: v };
    // assume bare mediaId
    return { icon16x16: `yoto:#${v}` };
  }
  return iconRef(fallbackMediaId, fallbackUrl);
}

// ---------- upload sequencing ----------
export async function uploadManySequential(files: File[], onProgress?: (i: number, total: number) => void) {
  const uniques = dedupeFiles(files);
  const results: { file: File; transcoded: Transcoded }[] = [];
  for (let i = 0; i < uniques.length; i++) {
    onProgress?.(i + 1, uniques.length);
    const { transcoded } = await uploadToYoto(uniques[i]);
    results.push({ file: uniques[i], transcoded });
  }
  return dedupeBySha(results);
}

// ---------- builders (one track per chapter) ----------
export function buildChaptersFrom(
  results: { file: File; transcoded: Transcoded }[],
  iconMediaId?: string | null,
  iconUrl?: string | null
) {
  const uniq = dedupeBySha(results);
  const chapters: any[] = [];
  for (let i = 0; i < uniq.length; i++) {
    const r = uniq[i];
    const info = r.transcoded.transcodedInfo || {};
    const title = (info && (info as any).metadata && (info as any).metadata.title) || r.file.name.replace(/\.[^.]+$/, "");
    const channels = asChannels((info as any).channels);

    const track: any = {
      key: "01",
      title,
      format: String((info as any).format || "aac"),
      trackUrl: `yoto:#${r.transcoded.transcodedSha256}`,
      type: "audio",
      overlayLabel: String(i + 1),
      duration: typeof (info as any).duration === "number" ? (info as any).duration : 1,
      fileSize: typeof (info as any).fileSize === "number" ? (info as any).fileSize : 1,
      display: iconRef(iconMediaId || null, iconUrl || null),
    };
    if (channels) track.channels = channels;

    chapters.push({
      key: pad2(i),                  // "00", "01", ...
      title,
      overlayLabel: String(i + 1),
      display: iconRef(iconMediaId || null, iconUrl || null),
      tracks: [track],               // one track per chapter
    });
  }
  return chapters;
}

// ---------- sanitizers ----------
export function sanitizeTrack(t: any) {
  const out: any = {
    key: String(t.key ?? "01"),
    title: String(t.title ?? "Track"),
    format: String(t.format || "aac"),
    trackUrl: String(t.trackUrl),
    type: "audio",
    overlayLabel: String(t.overlayLabel ?? "1"),
    duration: Number.isFinite(t.duration) ? t.duration : 1,
    fileSize: Number.isFinite(t.fileSize) ? t.fileSize : 1,
  };
  const ch = asChannels(t.channels);
  if (ch) out.channels = ch;
  if (t?.display && Object.prototype.hasOwnProperty.call(t.display, "icon16x16")) {
    out.display = normalizeIcon(t.display.icon16x16);
  }
  return out;
}

export function sanitizeChapter(c: any) {
  const tracks = Array.isArray(c.tracks) ? c.tracks.map(sanitizeTrack) : [];
  const out: any = {
    key: String(c.key ?? "00"),
    title: String(c.title ?? ""),
    overlayLabel: String(c.overlayLabel ?? "1"),
    display: normalizeIcon(c?.display?.icon16x16 ?? null),
    tracks: dedupeTracksByUrl(tracks),
  };
  return out;
}

// ---------- merger (append chapters; re-key from 00; avoid dup trackUrls) ----------
export function mergeChaptersIntoContent(
  existing: any,
  newChapters: any[],
  defaultIconMediaId?: string | null,
  defaultIconUrl?: string | null
) {
  const E = (existing && existing.card && existing.card.content) || existing?.content || {};
  const inChapters = Array.isArray(E.chapters) ? E.chapters : [];

  // Sanitize existing chapters and normalize their tracks
  const sanitizedExisting: any[] = [];
  for (let i = 0; i < inChapters.length; i++) sanitizedExisting.push(sanitizeChapter(inChapters[i]));

  // Build a set of existing trackUrls across all chapters to avoid adding duplicates
  const existingUrls = new Set<string>();
  for (let i = 0; i < sanitizedExisting.length; i++) {
    const ch = sanitizedExisting[i];
    const trs = Array.isArray(ch.tracks) ? ch.tracks : [];
    for (let j = 0; j < trs.length; j++) existingUrls.add(String(trs[j].trackUrl));
  }

  // Sanitize incoming chapters and drop any track already present
  const incoming: any[] = [];
  for (let i = 0; i < newChapters.length; i++) {
    const sc = sanitizeChapter(newChapters[i]);
    const filteredTracks: any[] = [];
    for (let j = 0; j < sc.tracks.length; j++) {
      const url = String(sc.tracks[j].trackUrl);
      if (!existingUrls.has(url)) { filteredTracks.push(sc.tracks[j]); existingUrls.add(url); }
    }
    if (filteredTracks.length > 0) {
      sc.tracks = filteredTracks;
      // ensure chapter display present (prefer URL)
      if (!sc.display || !Object.prototype.hasOwnProperty.call(sc.display, "icon16x16")) {
        sc.display = iconRef(defaultIconMediaId || null, defaultIconUrl || null);
      }
      incoming.push(sc);
    }
  }

  const merged = sanitizedExisting.concat(incoming);

  // Re-key chapters from 00.. and align overlay labels; also reset each track key to "01"
  for (let i = 0; i < merged.length; i++) {
    merged[i].key = pad2(i);
    merged[i].overlayLabel = String(i + 1);
    const trs = Array.isArray(merged[i].tracks) ? merged[i].tracks : [];
    for (let j = 0; j < trs.length; j++) {
      trs[j].key = "01"; // one track per chapter
      trs[j].overlayLabel = String(i + 1);
    }
    merged[i].tracks = trs;
  }

  return {
    chapters: merged,
    // Keep config conservative; page may extend if needed
    config: { onlineOnly: false, ...(E.config || {}) },
    // Page should include: activity: "yoto_Player", version: "1", playbackType if desired
  };
}

// ---------- Back‑compat thin wrappers ----------
export function buildTracksFrom(
  results: { file: File; transcoded: Transcoded }[],
  iconMediaId?: string | null,
  iconUrl?: string | null
) {
  const chapters = buildChaptersFrom(results, iconMediaId, iconUrl);
  const tracks: any[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const t = chapters[i].tracks[0];
    const clone = { ...t, key: pad2(i + 1), overlayLabel: String(i + 1) };
    tracks.push(clone);
  }
  return dedupeTracksByUrl(tracks);
}

export function mergeTracksIntoContent(
  existing: any,
  newTracks: any[],
  chapterIconMediaId?: string | null,
  chapterIconUrl?: string | null
) {
  const chapters: any[] = [];
  for (let i = 0; i < newTracks.length; i++) {
    const t = sanitizeTrack(newTracks[i]);
    const title = String(t.title || "");
    const display = iconRef(chapterIconMediaId || null, chapterIconUrl || null);
    chapters.push({ key: pad2(i), title, overlayLabel: String(i + 1), display, tracks: [t] });
  }
  return mergeChaptersIntoContent(existing, chapters, chapterIconMediaId || null, chapterIconUrl || null);
}
