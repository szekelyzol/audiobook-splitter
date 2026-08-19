import { useCallback } from 'react';
import { YT_DLP_CLIENT_ARGS } from '../constants/commands';

export function useBatchCommandGenerator() {
  const generateBatchCommands = useCallback((urls: string[]): string[] => {
    if (urls.length === 0) return [];

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const folder = `playlist_${timestamp}`;
    const urlArgs = urls.map(url => `"${url}"`).join(' ');

    return [
      `# Download ${urls.length} video(s) as a numbered mp3 playlist`,
      '# Step 1: Make output folder',
      `mkdir "${folder}"`,
      '',
      '# Step 2: Download each URL, numbered in the order they were entered',
      `yt-dlp -x --audio-format mp3 ${YT_DLP_CLIENT_ARGS} -o "${folder}/%(autonumber)02d - %(title).100s.%(ext)s" --autonumber-start 1 ${urlArgs}`,
    ];
  }, []);

  return { generateBatchCommands };
}
