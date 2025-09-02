export type Chapter = { start: string; end: string; title: string };

export function normalizeTimestamp(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\.\d+/, "").trim();
  const parts = cleaned.split(":");
  if (parts.length === 2) return `00:${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  if (parts.length === 3) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  return cleaned;
}

export function sanitizeTitle(title: string): string {
  if (!title || title.trim() === "") return "Untitled_Chapter";
  let cleaned = title.replace(/^Chapter\s+\d+:?\s*/i, "").replace(/^\d+\.\s*/, "").trim();
  if (!cleaned || /^\d+$/.test(cleaned)) cleaned = title.trim();
  return (
    cleaned
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50) || "Untitled_Chapter"
  );
}

export function parseTimestamps(input: string): Chapter[] {
  if (!input.trim()) return [];
  const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
  let startIndex = lines[0]?.toUpperCase() === "WEBVTT" ? 1 : 0;
  const chapters: Chapter[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("-->")) {
      const [start, end = ""] = line.split("-->").map((p) => p.trim());
      const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
      chapters.push({ start: normalizeTimestamp(start), end: normalizeTimestamp(end), title: sanitizeTitle(title) });
      i++;
    } else if (/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i.test(line)) {
      const t = line.match(/(\d+:[\d:]+)/);
      let title = ""; let start = "";
      if (t) { start = normalizeTimestamp(t[1]); title = line.replace(t[0], "").replace(/[-–—]/g, "").trim(); }
      else { const c = line.match(/Chapter\s+(\d+)/i); if (c) { title = line; start = "00:00:00"; } }
      if (start && title) chapters.push({ start, end: "", title: sanitizeTitle(title) });
    }
  }
  for (let i = 0; i < chapters.length - 1; i++) if (!chapters[i].end) chapters[i].end = chapters[i + 1].start;
  return chapters;
}

export function buildCommands(sourceUrl: string, rawTimestamps: string) {
  const chapters = parseTimestamps(rawTimestamps);
  const windows: string[] = [];
  const macos: string[] = [];

  if (chapters.length === 0) {
    windows.push(`# Download full audio as single file`);
    windows.push(`.\\yt-dlp -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);
    macos.push(`# Download full audio as single file`);
    macos.push(`yt-dlp -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);
    return { windows, macos, chapters };
  }

  windows.push(`# Step 1: Download audio from source`);
  windows.push(`.\\yt-dlp -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
  windows.push("");
  windows.push(`# Step 2: Split audio into chapters`);
  windows.push("");
  chapters.forEach((c, i) => {
    const idx = String(i + 1).padStart(2, "0");
    let cmd = `.\\ffmpeg -i "audiobook.mp3" -ss ${c.start}`;
    if (c.end) cmd += ` -to ${c.end}`;
    cmd += ` -c copy "${idx}_${c.title}.mp3"`;
    windows.push(cmd);
  });

  macos.push(`# Step 1: Download audio from source`);
  macos.push(`yt-dlp -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
  macos.push("");
  macos.push(`# Step 2: Split audio into chapters`);
  macos.push("");
  chapters.forEach((c, i) => {
    const idx = String(i + 1).padStart(2, "0");
    let cmd = `ffmpeg -i "audiobook.mp3" -ss ${c.start}`;
    if (c.end) cmd += ` -to ${c.end}`;
    cmd += ` -c copy "${idx}_${c.title}.mp3"`;
    macos.push(cmd);
  });

  return { windows, macos, chapters };
}
