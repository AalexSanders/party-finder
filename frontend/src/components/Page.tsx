import type { ReactNode } from 'react';
import styles from './Page.module.css';

/** Обычная страница с контентом по центру (ширина 1120px, как в Figma). */
export function Page({ children, gap = 24 }: { children: ReactNode; gap?: number }) {
  return (
    <main className={styles.page}>
      <div className={styles.inner} style={{ gap }}>
        {children}
      </div>
    </main>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className={styles.titleRow}>
      <div className={styles.titles}>
        <h1 className="t-h1">{title}</h1>
        {subtitle && <p className="t-body-l c-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, padding = 24, gap = 16, className }: { children: ReactNode; padding?: number; gap?: number; className?: string }) {
  return (
    <section className={`${styles.card} ${className ?? ''}`} style={{ padding, gap }}>
      {children}
    </section>
  );
}
