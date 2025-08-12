import { Chapter, ParsedResult } from '@/types';

export const normalizeTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  
  const cleaned = timestamp.replace(/\.\d+/, '').trim();
  const parts = cleaned.split(':');
  
  if (parts.length === 2) {
    return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  } else if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  
  return cleaned;
};

export const sanitizeTitle = (title: string): string => {
  return title
    .replace(/^Chapter \d+:?\s*/i, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50)
    || 'Untitled_Chapter';
};

export const parseTimestamps = (input: string): ParsedResult => {
  const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
  const chapters: Chapter[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    return { chapters: [], isValid: false, errors: ['No input provided'] };
  }

  let startIndex = 0;
  if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('-->')) {
      // WebVTT format
      const [start, end = ''] = line.split('-->').map(part => part.trim());
      const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
      
      if (!start) {
        errors.push(`Line ${i + 1}: Missing start time`);
        continue;
      }

      chapters.push({
        start: normalizeTimestamp(start),
        end: normalizeTimestamp(end),
        title: sanitizeTitle(title)
      });
      i++; // Skip title line
    } else if (line.match(/[\d:]+/)) {
      // Simple format
      const timeMatch = line.match(/(\d+:[\d:]+)/);
      if (timeMatch) {
        const start = normalizeTimestamp(timeMatch[1]);
        const titleMatch = line.replace(timeMatch[0], '').replace(/[-–—]/g, '').trim();
        const title = titleMatch || `Chapter ${chapters.length + 1}`;
        
        chapters.push({
          start,
          end: '',
          title: sanitizeTitle(title)
        });
      }
    }
  }

  // Fill in end times
  for (let i = 0; i < chapters.length - 1; i++) {
    if (!chapters[i].end) {
      chapters[i].end = chapters[i + 1].start;
    }
  }

  return {
    chapters,
    isValid: chapters.length > 0 && errors.length === 0,
    errors
  };
};