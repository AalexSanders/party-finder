import type { CSSProperties } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { EventCategory, EventSummary } from '../api/types';
import { CATEGORIES } from '../lib/categories';
import { formatEventWhen, formatPrice, meetupsLabel } from '../lib/format';
import { CategoryBadge } from './ui/Badges';
import styles from './EventCard.module.css';

/** Обложка-заглушка по категории (у событий в MVP нет загружаемых фото). */
export function EventCover({
  category,
  size = 88,
  className,
  style,
}: {
  category: EventCategory;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { icon: Icon, gradient } = CATEGORIES[category];
  return (
    <div
      className={`${styles.cover} ${className ?? ''}`}
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, minWidth: size, minHeight: size, ...style }}
      aria-hidden
    >
      <span className={styles.blob1} />
      <span className={styles.blob2} />
      <Icon size={Math.max(18, Math.min(36, size * 0.36))} className={styles.coverIcon} />
    </div>
  );
}

interface Props {
  event: EventSummary;
  selected?: boolean;
  showMeetups?: boolean;
  onClick?: () => void;
}

export function EventCard({ event, selected, showMeetups = true, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`${styles.card} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      data-event-id={event.id}
    >
      <EventCover category={event.category} />
      <div className={styles.info}>
        <div className={styles.top}>
          <CategoryBadge category={event.category} />
          <span className="t-caption c-secondary">{formatPrice(event.price)}</span>
        </div>
        <h3 className={`t-h4 ${styles.title}`}>{event.title}</h3>
        <div className={styles.meta}>
          <span className={styles.row}>
            <Calendar size={14} />
            {formatEventWhen(event.startsAt, event.endsAt)}
          </span>
          <span className={styles.row}>
            <MapPin size={14} />
            {event.venueName}
          </span>
          {showMeetups && (
            <span className={`${styles.row} ${styles.meetups}`}>
              <Users size={14} />
              {meetupsLabel(event.meetupsCount, event.participantsCount)}
            </span>
          )}
        </div>
      </div>
    </Tag>
  );
}
