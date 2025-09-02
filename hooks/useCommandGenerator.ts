import { useCallback } from 'react';
import { sanitizeFilename } from '../utils/filename';
import type { Chapter } from '../types/chapter';

export function useCommandGenerator() {
  const generateCommands = useCallback((url: string, chapters: Chapter[], customTitle?: string): string[] => {
    const commands: string[] = [];
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

    const useCustomTitle = !!(customTitle && customTitle.trim().length > 0);
    const sanitizedTitle = useCustomTitle ? sanitizeFilename(customTitle!.trim()) : '';

    // --- SPLIT-ONLY MODE ----------------------------------------------------
    // No URL provided, but we have chapters: split a local file and save into a folder.
    if (!url && chapters.length > 0) {
      const folderName = useCustomTitle ? `${sanitizedTitle}_${timestamp}` : `output_${timestamp}`;
      const inputFile = useCustomTitle ? `${sanitizedTitle}.mp3` : 'audiobook.mp3';

      commands.push('# Split local audio into chapters');
      commands.push(`# Input file: ${inputFile}`);
      commands.push('');
      commands.push('# Step 1: Make output folder');
      commands.push(`mkdir "${folderName}"`);
      commands.push('');
      commands.push('# Step 2: Split audio into chapters');
      commands.push('');

      chapters.forEach((chapter, index) => {
        const paddedIndex = (index + 1).toString().padStart(2, '0');
        const safeChapter = sanitizeFilename(chapter.title || `part_${paddedIndex}`);
        let cmd = `ffmpeg -i "${inputFile}" -ss ${chapter.start}`;
        if (chapter.end) cmd += ` -to ${chapter.end}`;
        cmd += ` -c copy "${folderName}/${paddedIndex}_${safeChapter}.mp3"`;
        commands.push(cmd);
      });
      return commands;
    }

    // --- DOWNLOAD-ONLY MODE -------------------------------------------------
    // URL provided but no chapters: download whole file only
    if (url && chapters.length === 0) {
      commands.push('# Download full audio as single file');
      if (useCustomTitle) {
        commands.push(`yt-dlp -x --audio-format mp3 -o "${sanitizedTitle}.%(ext)s" "${url}"`);
      } else {
        // keep original title (truncated to 100 chars) for convenience
        commands.push(`yt-dlp -x --audio-format mp3 -o "%(title).100s.%(ext)s" "${url}"`);
      }
      return commands;
    }

    // --- DOWNLOAD + SPLIT MODE ---------------------------------------------
    // URL + chapters present: download then split into a timestamped folder
    commands.push('# Step 1: Download audio from source');

    if (useCustomTitle) {
      commands.push(`yt-dlp -x --audio-format mp3 -o "${sanitizedTitle}.%(ext)s" "${url}"`);
      commands.push('');
      commands.push('# Step 2: Make output folder');
      const folder = `${sanitizedTitle}_${timestamp}`;
      commands.push(`mkdir "${folder}"`);
      commands.push('');
      commands.push('# Step 3: Split audio into chapters');
      commands.push('');

      chapters.forEach((chapter, index) => {
        const paddedIndex = (index + 1).toString().padStart(2, '0');
        const safeChapter = sanitizeFilename(chapter.title || `part_${paddedIndex}`);
        let cmd = `ffmpeg -i "${sanitizedTitle}.mp3" -ss ${chapter.start}`;
        if (chapter.end) cmd += ` -to ${chapter.end}`;
        cmd += ` -c copy "${sanitizedTitle}_${timestamp}/${paddedIndex}_${safeChapter}.mp3"`;
        commands.push(cmd);
      });
    } else {
      commands.push(`yt-dlp -x --audio-format mp3 -o "full_audio.%(ext)s" "${url}"`);
      commands.push('');
      commands.push('# Step 2: Make output folder');
      const folder = `output_${timestamp}`;
      commands.push(`mkdir "${folder}"`);
      commands.push('');
      commands.push('# Step 3: Split audio into chapters');
      commands.push('');

      chapters.forEach((chapter, index) => {
        const paddedIndex = (index + 1).toString().padStart(2, '0');
        const safeChapter = sanitizeFilename(chapter.title || `part_${paddedIndex}`);
        let cmd = `ffmpeg -i "full_audio.mp3" -ss ${chapter.start}`;
        if (chapter.end) cmd += ` -to ${chapter.end}`;
        cmd += ` -c copy "${folder}/${paddedIndex}_${safeChapter}.mp3"`;
        commands.push(cmd);
      });
    }

    return commands;
  }, []);

  return { generateCommands };
}
