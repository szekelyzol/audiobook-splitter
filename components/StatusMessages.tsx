import React from 'react';
import styles from '../styles/Home.module.css';

export type Status = { type: 'info' | 'error' | 'notice' | 'success'; text: string } | null;

type Props = {
  message: Status;
};

export const StatusMessages: React.FC<Props> = ({ message }) => {
  if (!message) return <div className={styles.messageContainer} />;

  let className = styles.infoMessage;
  switch (message.type) {
    case 'error':
      className = styles.errorMessage;
      break;
    case 'success':
      className = (styles as any).successMessage || (styles as any).successMinimal || styles.infoMessage;
      break;
    case 'notice':
      className = styles.infoMessage;
      break;
    default:
      className = styles.infoMessage;
  }

  return (
    <div className={styles.messageContainer}>
      <p className={className} role="status" aria-live="polite">{message.text}</p>
    </div>
  );
};
