import { memo } from 'react';
import styles from '../styles/Home.module.css';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const UrlInput = memo<UrlInputProps>(({ value, onChange }) => {
  return (
    <input
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="youtube url"
      className={styles.inputBase}
      aria-label="YouTube URL"
    />
  );
});

UrlInput.displayName = 'UrlInput';