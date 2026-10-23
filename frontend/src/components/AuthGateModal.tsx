import { useLocation } from 'react-router';
import { Users } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import styles from './AuthGateModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  text?: string;
}

/** Гость нажал действие, для которого нужен аккаунт (экран 16 в Figma). */
export function AuthGateModal({
  open,
  onClose,
  title = 'Войдите, чтобы присоединиться',
  text = 'Так организатор встречи узнает, кто придёт, а вы сможете управлять своими встречами',
}: Props) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return (
    <Modal open={open} onClose={onClose} width={420} bare title={title}>
      <div className={styles.body}>
        <span className={styles.icon}>
          <Users size={26} />
        </span>
        <h2 className="t-h2">{title}</h2>
        <p className="t-body-m c-secondary">{text}</p>
        <div className={styles.actions}>
          <Button size="l" block to={`/login?returnTo=${returnTo}`}>
            Войти
          </Button>
          <Button size="l" block variant="secondary" to={`/register?returnTo=${returnTo}`}>
            Создать аккаунт
          </Button>
        </div>
      </div>
    </Modal>
  );
}
