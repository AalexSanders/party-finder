import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'destructive';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: 'm' | 'l';
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  /** Если задан — рендерим ссылку роутера с видом кнопки. */
  to?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'm',
  icon: Icon,
  loading,
  block,
  to,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  const cls = [styles.button, styles[variant], styles[size], block && styles.block, !children && styles.iconOnly, className]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'm' ? 18 : 20;
  const content = (
    <>
      {loading ? <Loader2 size={iconSize} className={styles.spin} /> : Icon && <Icon size={iconSize} strokeWidth={2} />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
