import React from 'react';
import styles from '../styles/Home.module.css';

type Props = {
  sourceUrl: string;
  debouncedUrl: string;
  isValidUrl: boolean;
  hasTimestamps: boolean; // true only when chapters were parsed successfully
  chaptersCount: number;
  showValidation: boolean;
  allowEmptyUrl?: boolean; // when true, we don't error on missing URL (split-only mode)
  timestampProvided?: boolean; // distinguishes empty input from invalid timestamps
};

export const StatusMessages: React.FC<Props> = ({
  sourceUrl,
  debouncedUrl,
  isValidUrl,
  hasTimestamps,
  chaptersCount,
  showValidation,
  allowEmptyUrl = false,
  timestampProvided = false,
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

      {/* download-only info (URL ok, no timestamps provided at all) */}
      {sourceUrl && isValidUrl && !timestampProvided && (
        <p className={styles.infoMessage}>ℹ no timestamps provided - will download as single mp3 file</p>
      )}

      {/* invalid timestamps (text present but nothing parsed) */}
      {sourceUrl && isValidUrl && timestampProvided && !hasTimestamps && (
        <p className={styles.errorMessage}>⚠ no valid timestamps found</p>
      )}

      {/* success */}
      {(sourceUrl ? isValidUrl : allowEmptyUrl) && hasTimestamps && chaptersCount > 0 && (
        <p className={styles.successMessage}>✓ found {chaptersCount} chapter(s)</p>
      )}
    </div>
  );
};
