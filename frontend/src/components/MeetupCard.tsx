import { Check, Clock, Pencil } from 'lucide-react';
import type { Meetup } from '../api/types';
import { formatTime, plural } from '../lib/format';
import { Avatar, AvatarStack, StatusPill } from './ui/Badges';
import { Button } from './ui/Button';
import styles from './MeetupCard.module.css';

interface Props {
  meetup: Meetup;
  onJoin: () => void;
  joining?: boolean;
}

export function MeetupCard({ meetup, onJoin, joining }: Props) {
  const full = meetup.participantsCount >= meetup.maxParticipants;
  const mine = meetup.isOrganizer || meetup.isParticipant;

  let action;
  if (meetup.isOrganizer) action = <Button variant="secondary" icon={Pencil} to={`/meetups/${meetup.id}`}>Управлять</Button>;
  else if (meetup.isParticipant) action = <Button variant="secondary" icon={Check} to={`/meetups/${meetup.id}`}>Вы идёте</Button>;
  else if (full) action = <Button variant="secondary" disabled>Мест нет</Button>;
  else action = <Button onClick={onJoin} loading={joining}>Присоединиться</Button>;

  return (
    <article className={`${styles.card} ${mine ? styles.mine : ''}`}>
      <div className={styles.head}>
        <Avatar name={meetup.organizer.name} size="l" />
        <div className={styles.titles}>
          <h4 className="t-h4">{meetup.title}</h4>
          <span className="t-caption c-tertiary">
            {meetup.isOrganizer ? 'Вы организатор' : `Организатор — ${meetup.organizer.name}`}
          </span>
        </div>
        {meetup.visibility === 'LinkOnly' && <StatusPill tone="neutral" dot={false}>По ссылке</StatusPill>}
      </div>
      <div className={styles.meta}>
        <Clock size={14} />
        Сбор в {formatTime(meetup.meetingTime)} · {meetup.meetingPoint}
      </div>
      {meetup.description && <p className={`t-body-s c-secondary ${styles.description}`}>{meetup.description}</p>}
      <div className={styles.footer}>
        <div className={styles.participants}>
          <AvatarStack names={meetup.participantsPreview.map((p) => p.name)} />
          <span className={`t-body-s ${full ? styles.full : 'c-secondary'}`}>
            {meetup.participantsCount} из {meetup.maxParticipants}
            {!full && ` ${plural(meetup.maxParticipants, 'места', 'мест', 'мест')}`}
          </span>
        </div>
        {action}
      </div>
    </article>
  );
}
