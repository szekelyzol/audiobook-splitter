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
  if (!title || title.trim() === '') return 'Untitled';

  let cleaned = title
    .replace(/^\s*\d+\s*([.)-]\s*|\s+-\s*)/, '')
    .trim();

  if (!cleaned || /^\d+$/.test(cleaned)) cleaned = title.trim();

  return cleaned
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) || 'Untitled';
};