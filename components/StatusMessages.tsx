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
  let messageContent = null;

  // Only show validation messages when appropriate
  if (showValidation) {
    if (sourceUrl && !isValidUrl) {
      messageContent = <div className={styles.errorMessage}>⚠ invalid youtube url format</div>;
    } else if (!sourceUrl && hasTimestamps) {
      messageContent = <div className={styles.errorMessage}>⚠ missing youtube url</div>;
    } else if (debouncedUrl && isValidUrl && hasTimestamps && chaptersCount === 0) {
      messageContent = (
        <div className={styles.infoMessage}>
          ✓ youtube url looks good — no valid timestamps found, so this will download as a single mp3 file
        </div>
      );
    } else if (debouncedUrl && isValidUrl && !hasTimestamps) {
      messageContent = (
        <div className={styles.infoMessage}>
          ✓ youtube url looks good, but no timestamps provided — this will download as a single mp3 file
        </div>
      );
    } else if (debouncedUrl && isValidUrl && chaptersCount > 0) {
      messageContent = (
        <div className={styles.successMessage}>
          ✓ found {chaptersCount} chapter(s)
        </div>
      );
    }
  }

  // Always render the container to reserve space
  return (
    <div className={styles.messageContainer}>
      {messageContent}
    </div>
  );
});

StatusMessages.displayName = 'StatusMessages';