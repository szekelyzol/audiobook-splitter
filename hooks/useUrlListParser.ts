import { useCallback } from 'react';
import { isValidYouTubeUrl, normalizeYouTubeUrl } from '../utils/youtube';

export interface ParsedUrlList {
  validUrls: string[];
  invalidLines: string[];
}

// Strips leading list markers users often paste along with a list of links,
// e.g. "- ", "* ", "• ", "1. ", "2) " — so a bare marker line (no URL after it) becomes empty and is dropped.
const LIST_MARKER_RE = /^[\s]*(?:[-*•‣▪·>]+|\d+[.):])\s*/;
const stripListMarker = (line: string): string => line.replace(LIST_MARKER_RE, '').trim();

export function useUrlListParser() {
  const parseUrlList = useCallback((input: string): ParsedUrlList => {
    const lines = input.split('\n').map(line => stripListMarker(line)).filter(line => line !== '');
    const validUrls: string[] = [];
    const invalidLines: string[] = [];

    for (const line of lines) {
      if (isValidYouTubeUrl(line)) {
        validUrls.push(normalizeYouTubeUrl(line));
      } else {
        invalidLines.push(line);
      }
    }

    return { validUrls, invalidLines };
  }, []);

  return { parseUrlList };
}
