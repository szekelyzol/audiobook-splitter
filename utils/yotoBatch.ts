// File: utils/yotoBatch.ts (patched)
// Helpers for building Yoto playlist payloads that match the first‑party web app
// – One track per chapter
// – Chapter display.icon16x16 always present (nullable allowed)
// – Top‑level content fields are set by the page when composing the final body

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

function chapterDisplayFrom(mediaId?: string | null) {
  return { icon16x16: mediaId ? `yoto:#${mediaId}` : null };
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
  iconMediaId?: string | null
) {
  // BUGFIX: previously we wrongly deduped using trackUrl on wrapper objects ({track, title}),
  // which collapsed the array to a single item. We now dedupe by SHA first, then build chapters.
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
    };
    if (channels) track.channels = channels;
    if (iconMediaId) track.display = { icon16x16: `yoto:#${iconMediaId}` };

    chapters.push({
      key: pad2(i),                  // "00", "01", ...
      title,
      overlayLabel: String(i + 1),
      display: chapterDisplayFrom(iconMediaId || null),
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
  if (t?.display && t.display.hasOwnProperty("icon16x16")) {
    out.display = { icon16x16: t.display.icon16x16 === null ? null : String(t.display.icon16x16) };
  }
  return out;
}

export function sanitizeChapter(c: any) {
  const tracks = Array.isArray(c.tracks) ? c.tracks.map(sanitizeTrack) : [];
  const out: any = {
    key: String(c.key ?? "00"),
    title: String(c.title ?? ""),
    overlayLabel: String(c.overlayLabel ?? "1"),
    display: chapterDisplayFrom(c?.display?.icon16x16 ? String(c.display.icon16x16).replace(/^yoto:#/, "").split("#").pop() : null),
    tracks: dedupeTracksByUrl(tracks),
  };
  return out;
}

// ---------- merger (append chapters; re-key from 00; avoid dup trackUrls) ----------
export function mergeChaptersIntoContent(existing: any, newChapters: any[], defaultIconMediaId?: string | null) {
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
      // ensure chapter display present
      if (!sc.display || !sc.display.hasOwnProperty("icon16x16")) {
        sc.display = chapterDisplayFrom(defaultIconMediaId || null);
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
    // The page should also include: activity: "yoto_Player", version: "1"
  };
}

// ---------- Back‑compat thin wrappers (safe no‑ops for old call sites) ----------
export function buildTracksFrom(
  results: { file: File; transcoded: Transcoded }[],
  iconMediaId?: string | null
) {
  const chapters = buildChaptersFrom(results, iconMediaId);
  const tracks: any[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const t = chapters[i].tracks[0];
    const clone = { ...t, key: pad2(i + 1), overlayLabel: String(i + 1) };
    tracks.push(clone);
  }
  return dedupeTracksByUrl(tracks);
}

export function mergeTracksIntoContent(existing: any, newTracks: any[], chapterIconMediaId?: string | null) {
  const chapters: any[] = [];
  for (let i = 0; i < newTracks.length; i++) {
    const t = sanitizeTrack(newTracks[i]);
    chapters.push({ key: pad2(i), title: String(t.title || ""), overlayLabel: String(i + 1), display: chapterDisplayFrom(chapterIconMediaId || null), tracks: [t] });
  }
  return mergeChaptersIntoContent(existing, chapters, chapterIconMediaId || null);
}
