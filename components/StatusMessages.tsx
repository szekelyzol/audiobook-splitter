import React from 'react';
import styles from '../styles/Home.module.css';

type Props = {
  sourceUrl: string;
  debouncedUrl: string;
  isValidUrl: boolean;
  hasTimestamps: boolean;
  chaptersCount: number;
  showValidation: boolean;
  allowEmptyUrl?: boolean; // new
};

export const StatusMessages: React.FC<Props> = ({
  sourceUrl,
  debouncedUrl,
  isValidUrl,
  hasTimestamps,
  chaptersCount,
  showValidation,
  allowEmptyUrl = false,
}) => {
  if (!showValidation) return <div className={styles.messageContainer} />;

  return (
    <div className={styles.messageContainer}>
      {/* invalid url */}
      {sourceUrl && !isValidUrl && (
        <p className={styles.errorMessage}>⚠ invalid youtube url format</p>
      )}

      {/* missing url — suppressed in split-only mode */}
      {!sourceUrl && hasTimestamps && !allowEmptyUrl && (
        <p className={styles.errorMessage}>⚠ missing youtube url</p>
      )}

      {/* no valid timestamps */}
      {sourceUrl && isValidUrl && hasTimestamps === false && debouncedUrl && (
        <p className={styles.errorMessage}>⚠ no valid timestamps found</p>
      )}

      {/* info when downloading single file */}
      {sourceUrl && isValidUrl && !hasTimestamps && !debouncedUrl && (
        <p className={styles.infoMessage}>ℹ no timestamps provided - will download as single mp3 file</p>
      )}

      {/* success */}
      {(sourceUrl ? isValidUrl : allowEmptyUrl) && hasTimestamps && chaptersCount > 0 && (
        <p className={styles.successMessage}>✓ found {chaptersCount} chapter(s)</p>
      )}
    </div>
  );
};
