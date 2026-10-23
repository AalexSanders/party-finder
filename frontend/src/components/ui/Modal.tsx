import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  width?: number;
  title?: string;
  subtitle?: string;
  /** Скрыть шапку с крестиком — для коротких диалогов-подтверждений. */
  bare?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, width = 600, title, subtitle, bare, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.dialog} style={{ width }} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        {!bare && (
          <div className={styles.header}>
            <div className={styles.titles}>
              {title && <h2 className="t-h2">{title}</h2>}
              {subtitle && <p className="t-body-m c-secondary">{subtitle}</p>}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
