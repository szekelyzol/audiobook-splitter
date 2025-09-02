import type { Chapter } from '../types/chapter';
import { sanitizeFilename } from '../utils/filename';

export function useCommandGenerator() {
  const generateCommands = (url: string, chapters: Chapter[], customTitle?: string): string[] => {
    const safeTitle = sanitizeFilename(customTitle || 'audiobook');

    // Split-only mode (no URL): just ffmpeg commands against a local input file name
    if (!url) {
      const inputFile = `${safeTitle}.mp3`;
      const lines: string[] = [];
      lines.push(`# Split local audio into ${chapters.length} part(s)`);
      chapters.forEach((c, i) => {
        const index = String(i + 1).padStart(2, '0');
        const out = `${index}_${sanitizeFilename(c.title || `part_${index}`)}.mp3`;
        const to = c.end ? ` -to ${c.end}` : '';
        lines.push(`ffmpeg -hide_banner -loglevel error -i "${inputFile}" -ss ${c.start}${to} -c copy "${out}"`);
      });
      return lines;
    }

    const cmds: string[] = [];

    if (chapters.length === 0) {
      // Download-only (no timestamps)
      cmds.push('# Download full audio as single file');
      cmds.push(`yt-dlp -x --audio-format mp3 -o "${safeTitle}.mp3" "${url}"`);
      return cmds;
    }

    // Download + split
    cmds.push('# Step 1: Download audio from source');
    cmds.push(`yt-dlp -x --audio-format mp3 -o "${safeTitle}.%(ext)s" "${url}"`);
    cmds.push('');
    cmds.push('# Step 2: Split audio into chapters');
    cmds.push('');

    chapters.forEach((c, i) => {
      const index = String(i + 1).padStart(2, '0');
      const out = `${index}_${sanitizeFilename(c.title || `part_${index}`)}.mp3`;
      const to = c.end ? ` -to ${c.end}` : '';
      cmds.push(`ffmpeg -hide_banner -loglevel error -i "${safeTitle}.mp3" -ss ${c.start}${to} -c copy "${out}"`);
    });

    return cmds;
  };

  return { generateCommands };
}
