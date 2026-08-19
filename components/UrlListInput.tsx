import { memo } from 'react';
import styles from '../styles/Home.module.css';

interface UrlListInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const UrlListInput = memo<UrlListInputProps>(({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={'youtube urls, one per line\nhttps://youtube.com/watch?v=...\nhttps://youtube.com/watch?v=...'}
      rows={8}
      className={styles.textareaBase}
      aria-label="YouTube URL list"
    />
  );
});

UrlListInput.displayName = 'UrlListInput';
