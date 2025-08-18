/**
 * Sanitizes a string to be safe for use as a filename
 * Removes or replaces characters that are problematic in filenames
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || filename.trim() === '') return 'Untitled';

  return filename
    // Replace illegal filename characters with underscores
    .replace(/[<>:"/\\|?*]/g, '_')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with underscores for shell safety
    .replace(/\s/g, '_')
    // Collapse multiple underscores
    .replace(/_{2,}/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Fallback if empty after processing
    || 'Untitled';
};

/**
 * Creates a timestamp string suitable for folder names
 */
// export const createTimestamp = (): string => {
//   return new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
// };