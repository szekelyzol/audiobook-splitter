import { useCallback } from 'react';
import { normalizeTimestamp, sanitizeTitle } from '../utils/timestamp';
import type { Chapter } from '../types/chapter';

export function useTimestampParser() {
  const parseTimestamps = useCallback((input: string): Chapter[] => {
    if (!input.trim()) return [];

    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const chapters: Chapter[] = [];

    let startIndex = 0;
    if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        const next = (lines[i + 1] ?? '').trim();
        const isNextCue = next.includes('-->');
        const hasTitle = next.length > 0 && !isNextCue;
        const titleCandidate = hasTitle ? next : '';

        chapters.push({
          start: normalizeTimestamp(start),
          end: normalizeTimestamp(end),
          title: sanitizeTitle(titleCandidate),
        });

        if (hasTitle) i++;
      }
      else if (line.match(/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i)) {
        const timeMatch = line.match(/(\d+:[\d:]+)/);
        let title = '';
        let start = '';

        if (timeMatch) {
          start = normalizeTimestamp(timeMatch[1]);
          const timeIdx = line.lastIndexOf(timeMatch[0]);
          const beforeRaw = line.slice(0, timeIdx);
          const afterRaw = line.slice(timeIdx + timeMatch[0].length);

          const beforeClean = beforeRaw
            .replace(/^\s*\d+\s*([.)-]\s*|\s+-\s*)/, '')
            .replace(/[-–—]\s*$/, '')
            .trim();

          const afterClean = afterRaw
            .replace(/^[-–—]\s*/, '')
            .trim();

          title = afterClean || beforeClean;
        } else {
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00';
          }
        }

        if (start) {
          chapters.push({
            start,
            end: '',
            title: sanitizeTitle(title)
          });
        }
      }
    }

    // Fill missing end times with next chapter's start
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
    }

    return chapters;
  }, []);

  return { parseTimestamps };
}