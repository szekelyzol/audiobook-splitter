import { useCallback } from 'react';
import type { Chapter } from '../types/chapter';

export function useCommandGenerator() {
  const generateCommands = useCallback((url: string, chapters: Chapter[]): string[] => {
    const commands: string[] = [];

    if (chapters.length === 0) {
      commands.push('# Download full audio as single file');
      commands.push(`yt-dlp -x --audio-format mp3 -o "full-audio.mp3" "${url}"`);
      return commands;
    }

    commands.push('# Step 1: Download audio from source');
    commands.push(`yt-dlp -x --audio-format mp3 -o "full-audio.%(ext)s" "${url}"`);
    commands.push('');

    commands.push('# Step 2: Make a unique output folder with date-timestamp');
    const folderName = `output_${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}`;
    commands.push(`mkdir "${folderName}"`);
    commands.push('');

    commands.push('# Step 3: Split audio into chapters');
    commands.push('');

    chapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `ffmpeg -i "full-audio.mp3" -ss ${chapter.start}`;
      if (chapter.end) {
        cmd += ` -to ${chapter.end}`;
      }
      cmd += ` -c copy "${folderName}/${paddedIndex}_${chapter.title}.mp3"`;
      commands.push(cmd);
    });

    return commands;
  }, []);

  return { generateCommands };
}