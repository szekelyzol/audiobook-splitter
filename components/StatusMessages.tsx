import React from 'react';
import styles from '../styles/Home.module.css';

// Accept a single computed message from the page via props
export type Status = { type: 'info' | 'error' | 'notice'; text: string } | null;

type Props = {
  message: Status;
};

export const StatusMessages: React.FC<Props> = ({ message }) => {
  if (!message) return <div className={styles.messageContainer} />;

  // Map message types to CSS classes
  const className =
    message.type === 'error' ? styles.errorMessage : styles.infoMessage; // 'notice' uses info styling

  return (
    <div className={styles.messageContainer}>
      <p className={className} role="status" aria-live="polite">{message.text}</p>
    </div>
  );
};
