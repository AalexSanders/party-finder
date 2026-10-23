import { useState, type ReactNode } from 'react';
import { Calendar, MapPin, Plus, Share2, Ticket, X, type LucideIcon } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useEvent, useEventMeetups, useJoinMeetup } from '../../api/queries';
import { useAuth } from '../../auth/AuthContext';
import { AuthGateModal } from '../../components/AuthGateModal';
import { EventCover } from '../../components/EventCard';
import { MeetupCard } from '../../components/MeetupCard';
import { MeetupFormModal } from '../../components/MeetupFormModal';
import { Avatar, CategoryBadge, StatusPill } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { formatLongDate, formatPrice, formatTime, isPast, relativeDay } from '../../lib/format';
import styles from './EventDetailsPanel.module.css';

type Gate = { title?: string; text?: string } | null;

export function EventDetailsPanel({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const event = useEvent(eventId);
  const meetups = useEventMeetups(eventId);
  const join = useJoinMeetup();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [creating, setCreating] = useState(false);

  const share = async () => {
    const ok = await navigator.clipboard?.writeText(window.location.href).then(() => true, () => false);
    toast({ type: ok ? 'success' : 'error', message: ok ? 'Ссылка на событие скопирована' : 'Не удалось скопировать ссылку' });
  };

  const onJoin = async (meetupId: string) => {
    if (!user) return setGate({});
    setJoiningId(meetupId);
    try {
      await join.mutateAsync(meetupId);
      toast({ type: 'success', message: 'Вы присоединились к встрече' });
    } catch (err) {
      toast({ type: 'error', message: err instanceof ApiError ? err.message : 'Не удалось присоединиться' });
    } finally {
      setJoiningId(null);
    }
  };

  const onCreate = () => {
    if (!user) return setGate({ title: 'Войдите, чтобы создать встречу', text: 'Встреча появится на странице события, и к вам смогут присоединиться' });
    setCreating(true);
  };

  if (event.isPending) {
    return (
      <aside className={styles.panel}>
        <Spinner />
      </aside>
    );
  }
  if (event.isError) {
    return (
      <aside className={styles.panel}>
        <div className={styles.content}>
          <button type="button" className={styles.closeInline} onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
          <ErrorState message={event.error.message} onRetry={() => event.refetch()} />
        </div>
      </aside>
    );
  }

  const e = event.data;
  const past = isPast(e.startsAt, e.endsAt);
  const list = meetups.data ?? [];

  return (
    <aside className={styles.panel} aria-label={e.title}>
      <div className={styles.hero}>
        <EventCover category={e.category} className={styles.heroCover} />
        <div className={styles.heroActions}>
          <button type="button" className={styles.roundBtn} onClick={share} aria-label="Поделиться">
            <Share2 size={18} />
          </button>
          <button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.titleGroup}>
          <div className={styles.tags}>
            <CategoryBadge category={e.category} />
            <span className="t-caption c-tertiary">· {relativeDay(e.startsAt, e.endsAt)}</span>
          </div>
          <h2 className="t-h2">{e.title}</h2>
          <div className={styles.organizer}>
            <Avatar name={e.organizerName} size="s" />
            <span className="t-body-s c-secondary">{e.organizerName} · организатор</span>
          </div>
        </div>

        <InfoRow icon={Calendar} title={formatLongDate(e.startsAt)} sub={eventHours(e.startsAt, e.endsAt)} />
        <InfoRow icon={MapPin} title={e.venueName} sub={e.address} />
        <InfoRow icon={Ticket} title={formatPrice(e.price)}
          sub={e.ticketUrl ? <a href={e.ticketUrl} target="_blank" rel="noreferrer" className="link">Билеты на сайте организатора</a> : e.price === null ? 'Вход свободный' : 'Билеты у организатора'} />

        <p className="t-body-m c-secondary">{e.description}</p>
        <hr className={styles.divider} />

        <div className={styles.meetupsHead}>
          <div className={styles.meetupsTitle}>
            <h3 className="t-h4">Встречи на событие</h3>
            {list.length > 0 && <StatusPill tone="brand" dot={false}>{list.length}</StatusPill>}
          </div>
          <p className="t-caption c-tertiary">
            {list.length ? 'Присоединяйтесь к компании или соберите свою' : 'Пока никто не собирает компанию — станьте первым'}
          </p>
        </div>
        {meetups.isPending ? (
          <Spinner />
        ) : (
          list.map((m) => <MeetupCard key={m.id} meetup={m} onJoin={() => onJoin(m.id)} joining={joiningId === m.id} />)
        )}
      </div>

      {!past && (
        <div className={styles.footer}>
          <Button size="l" block icon={Plus} onClick={onCreate}>
            Создать встречу
          </Button>
        </div>
      )}

      <AuthGateModal open={!!gate} onClose={() => setGate(null)} title={gate?.title} text={gate?.text} />
      <MeetupFormModal open={creating} onClose={() => setCreating(false)} event={e} />
    </aside>
  );
}

/** «19:00 – 22:30» или для многодневных «10:00 – 20:00 · до 30 ноября». */
function eventHours(startsAt: string, endsAt: string | null) {
  if (!endsAt) return formatTime(startsAt);
  const hours = `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
  const multiDay = new Date(endsAt).getTime() - new Date(startsAt).getTime() > 86400_000;
  return multiDay ? `${hours} · до ${formatLongDate(endsAt).split(', ')[1]}` : hours;
}

function InfoRow({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: ReactNode }) {
  return (
    <div className={styles.info}>
      <span className={styles.infoIcon}>
        <Icon size={18} />
      </span>
      <div className={styles.infoText}>
        <span className="t-body-m-medium">{title}</span>
        <span className="t-caption c-tertiary">{sub}</span>
      </div>
    </div>
  );
}
