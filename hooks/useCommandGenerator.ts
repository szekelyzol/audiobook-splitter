import { useCallback } from 'react';
import { sanitizeFilename } from '../utils/filename';
import type { Chapter } from '../types/chapter';

export function useCommandGenerator() {
  const generateCommands = useCallback((url: string, chapters: Chapter[], customTitle?: string): string[] => {
    const commands: string[] = [];
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    
    // Use custom title if provided
    const useCustomTitle = customTitle && customTitle.trim().length > 0;

    if (chapters.length === 0) {
      commands.push('# Download full audio as single file');
      if (useCustomTitle) {
        const sanitizedTitle = sanitizeFilename(customTitle.trim());
        commands.push(`yt-dlp -x --audio-format mp3 -o "${sanitizedTitle}.%(ext)s" "${url}"`);
      } else {
        commands.push(`yt-dlp -x --audio-format mp3 -o "%(title).100s.%(ext)s" "${url}"`);
      }
      return commands;
    }

    // Generate commands for splitting
    commands.push('# Step 1: Download audio from source');
    if (useCustomTitle) {
      const sanitizedTitle = sanitizeFilename(customTitle.trim());
      commands.push(`yt-dlp -x --audio-format mp3 -o "${sanitizedTitle}.%(ext)s" "${url}"`);
      commands.push('');

      commands.push('# Step 2: Make output folder');
      commands.push(`mkdir "${sanitizedTitle}_${timestamp}"`);
      commands.push('');

      commands.push('# Step 3: Split audio into chapters');
      commands.push('');

      chapters.forEach((chapter, index) => {
        const paddedIndex = (index + 1).toString().padStart(2, '0');
        let cmd = `ffmpeg -i "${sanitizedTitle}.mp3" -ss ${chapter.start}`;
        if (chapter.end) {
          cmd += ` -to ${chapter.end}`;
        }
        cmd += ` -c copy "${sanitizedTitle}_${timestamp}/${paddedIndex}_${chapter.title}.mp3"`;
        commands.push(cmd);
      });
    } else {
      commands.push(`yt-dlp -x --audio-format mp3 -o "full_audio.%(ext)s" "${url}"`);
      commands.push('');

      commands.push('# Step 2: Make output folder');
      const folderName = `output_${timestamp}`;
      commands.push(`mkdir "${folderName}"`);
      commands.push('');

      commands.push('# Step 3: Split audio into chapters');
      commands.push('');

      chapters.forEach((chapter, index) => {
        const paddedIndex = (index + 1).toString().padStart(2, '0');
        let cmd = `ffmpeg -i "full_audio.mp3" -ss ${chapter.start}`;
        if (chapter.end) {
          cmd += ` -to ${chapter.end}`;
        }
        cmd += ` -c copy "${folderName}/${paddedIndex}_${chapter.title}.mp3"`;
        commands.push(cmd);
      });
    }

    return commands;
  }, []);

  return { generateCommands };
}