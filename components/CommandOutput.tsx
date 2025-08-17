import { memo } from 'react';
import styles from '../styles/Home.module.css';

interface CommandOutputProps {
  commands: string[];
  onCopy: () => void;
  onReset: () => void;
}

export const CommandOutput = memo<CommandOutputProps>(({ commands, onCopy, onReset }) => {
  return (
    <div className={styles.commandOutput}>
      <pre>{commands.join('\n')}</pre>
      <div className={styles.commandActions}>
        <button onClick={onCopy} className={styles.actionButton} title="Copy commands to clipboard">
          copy
        </button>
        <button onClick={onReset} className={styles.actionButton} title="Clear everything">
          reset
        </button>
      </div>
    </div>
  );
});

CommandOutput.displayName = 'CommandOutput';