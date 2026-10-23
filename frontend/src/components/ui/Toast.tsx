import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
  action?: { label: string; onClick: () => void };
}

type ShowToast = (toast: Omit<ToastData, 'id'>) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback<ShowToast>(
    (toast) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className={styles.stack} aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={styles.toast} role="status">
              {t.type === 'success' ? (
                <CheckCircle2 size={20} className={styles.success} />
              ) : (
                <AlertCircle size={20} className={styles.error} />
              )}
              <span className={styles.message}>{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast вне ToastProvider');
  return ctx;
}
