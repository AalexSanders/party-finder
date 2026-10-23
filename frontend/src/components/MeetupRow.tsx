import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import type { EventCategory } from '../api/types';
import { dateBlock } from '../lib/format';
import { AvatarStack, CategoryBadge, StatusPill, type Tone } from './ui/Badges';
import styles from './MeetupRow.module.css';

interface Props {
  to: string;
  date: string;
  category: EventCategory;
  status: { tone: Tone; label: string };
  title: string;
  meta: string;
  people?: { names: string[]; label: string };
  /** Подпись справа, если аватаров нет (например, «Опубликовано сегодня»). */
  aside?: string;
  action: ReactNode;
  dimmed?: boolean;
}

/** Строка в списках «Мои встречи» и «Мои события» (компонент Meetup Row в Figma). */
export function MeetupRow({ to, date, category, status, title, meta, people, aside, action, dimmed }: Props) {
  const { day, month } = dateBlock(date);
  return (
    <div className={`${styles.row} ${dimmed ? styles.dimmed : ''}`}>
      <Link to={to} className={styles.date}>
        <span className="t-h2">{day}</span>
        <span className="t-overline">{month}</span>
      </Link>
      <div className={styles.info}>
        <div className={styles.tags}>
          <CategoryBadge category={category} />
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <Link to={to} className={`t-h4 ${styles.title}`}>
          {title}
        </Link>
        <span className={styles.meta}>
          <Clock size={14} />
          <span>{meta}</span>
        </span>
      </div>
      {people ? (
        <div className={styles.people}>
          <AvatarStack names={people.names} />
          <span className="t-body-s c-secondary">{people.label}</span>
        </div>
      ) : (
        aside && <span className="t-body-s c-secondary">{aside}</span>
      )}
      {action}
    </div>
  );
}
