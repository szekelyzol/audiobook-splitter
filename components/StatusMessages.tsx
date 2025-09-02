import React from 'react';
import styles from '../styles/Home.module.css';

export type Status = { type: 'info' | 'error' | 'notice' | 'success'; text: string } | null;

type Props = {
  message: Status;
};

export const StatusMessages: React.FC<Props> = ({ message }) => {
  if (!message) return <div className={styles.messageContainer} />;

  // Simplify: only two visual styles (error vs info)
  const className = message.type === 'error' ? styles.errorMessage : styles.infoMessage;

  return (
    <div className={styles.messageContainer}>
      <p className={className} role="status" aria-live="polite">{message.text}</p>
    </div>
  );
};
