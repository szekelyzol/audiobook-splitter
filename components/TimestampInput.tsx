import { memo } from 'react';
import styles from '../styles/Home.module.css';

interface TimestampInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const TimestampInput = memo<TimestampInputProps>(({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="timestamps (e.g. 00:00 Introduction)"
      rows={8}
      className={styles.textareaBase}
      aria-label="Timestamps"
    />
  );
});

TimestampInput.displayName = 'TimestampInput';