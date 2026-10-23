import type { ReactNode } from 'react';
import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';
import styles from './Feedback.module.css';

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  framed,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
  /** Пунктирная рамка-подложка, как в пустом состоянии «Мои встречи». */
  framed?: boolean;
}) {
  return (
    <div className={`${styles.empty} ${framed ? styles.framed : ''}`}>
      <span className={styles.emptyIcon}>
        <Icon size={framed ? 34 : 30} />
      </span>
      <h3 className={framed ? 't-h2' : 't-h3'}>{title}</h3>
      <p className={`${framed ? 't-body-l' : 't-body-m'} c-secondary ${styles.emptyText}`}>{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className={styles.spinner} role="status">
      <Loader2 size={24} className={styles.spin} />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className={styles.alert} role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={styles.errorState}>
      <Alert>{message}</Alert>
      {onRetry && (
        <button type="button" className="link" onClick={onRetry} style={{ border: 'none', background: 'none' }}>
          Повторить
        </button>
      )}
    </div>
  );
}
