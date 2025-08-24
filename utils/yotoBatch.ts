import { uploadToYoto } from "./yotoUpload";


export type Transcoded = {
transcodedSha256: string;
transcodedInfo?: { duration?: number; fileSize?: number; format?: string; channels?: number; metadata?: { title?: string } };
};


export async function uploadManySequential(files: File[], onProgress?: (i: number, total: number) => void) {
const results: { file: File; transcoded: Transcoded }[] = [];
for (let i = 0; i < files.length; i++) {
onProgress?.(i + 1, files.length);
const { transcoded } = await uploadToYoto(files[i]);
results.push({ file: files[i], transcoded });
}
return results;
}


export function buildTracksFrom(results: { file: File; transcoded: Transcoded }[], iconMediaId?: string | null) {
const tracks = results.map((r, idx) => {
const info = r.transcoded.transcodedInfo || {};
const title = info?.metadata?.title || r.file.name.replace(/\.[^.]+$/, "");
const overlay = String(idx + 1);
const key = (idx + 1).toString().padStart(2, "0");
const channels = info?.channels === 1 ? "mono" : info?.channels === 2 ? "stereo" : undefined;
const display = iconMediaId ? { icon16x16: `yoto:#${iconMediaId}` } : undefined;
return {
key,
title,
overlayLabel: overlay,
trackUrl: `yoto:#${r.transcoded.transcodedSha256}`,
duration: info?.duration ?? 1,
fileSize: info?.fileSize ?? 1,
format: info?.format || "mp3",
type: "audio",
...(channels ? { channels } : {}),
...(display ? { display } : {}),
};
});
return tracks;
}


export function mergeTracksIntoContent(existing: any, newTracks: any[]) {
const content = existing?.card?.content || existing?.content || {};
const chapters = Array.isArray(content.chapters) ? content.chapters.slice() : [];
if (chapters.length === 0) {
chapters.push({ key: "01", title: content?.title || "", tracks: newTracks });
} else {
const first = { ...chapters[0] };
const startIdx = Array.isArray(first.tracks) ? first.tracks.length : 0;
const remapped = newTracks.map((t, i) => ({
...t,
key: (startIdx + i + 1).toString().padStart(2, "0"),
overlayLabel: String(startIdx + i + 1),
}));
first.tracks = [...(first.tracks || []), ...remapped];
chapters[0] = first;
}
return { ...content, chapters };
}