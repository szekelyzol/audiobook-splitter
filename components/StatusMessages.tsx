import { memo } from 'react';
import styles from '../styles/Home.module.css';

interface StatusMessagesProps {
  sourceUrl: string;
  debouncedUrl: string;
  isValidUrl: boolean;
  hasTimestamps: boolean;
  chaptersCount: number;
  showValidation: boolean;
}

export const StatusMessages = memo<StatusMessagesProps>(({
  sourceUrl,
  debouncedUrl,
  isValidUrl,
  hasTimestamps,
  chaptersCount,
  showValidation
}) => {
  // Don't show validation messages while user is still typing
  if (!showValidation) {
    return null;
  }

  if (sourceUrl && !isValidUrl) {
    return <div className={styles.errorMessage}>⚠ invalid youtube url format</div>;
  }

  if (!sourceUrl && hasTimestamps) {
    return <div className={styles.errorMessage}>⚠ missing youtube url</div>;
  }

  if (debouncedUrl && isValidUrl && hasTimestamps && chaptersCount === 0) {
    return (
      <div className={styles.infoMessage}>
        ✓ youtube url looks good — no valid timestamps found, so this will download as a single mp3 file
      </div>
    );
  }

  if (debouncedUrl && isValidUrl && !hasTimestamps) {
    return (
      <div className={styles.infoMessage}>
        ✓ youtube url looks good, but no timestamps provided — this will download as a single mp3 file
      </div>
    );
  }

  if (debouncedUrl && isValidUrl && chaptersCount > 0) {
    return (
      <div className={styles.successMessage}>
        ✓ found {chaptersCount} chapter(s)
      </div>
    );
  }

  return null;
});

StatusMessages.displayName = 'StatusMessages';