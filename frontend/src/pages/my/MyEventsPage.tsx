import { useState } from 'react';
import { useLocation } from 'react-router';
import { CheckCircle2, Plus, Ticket, X } from 'lucide-react';
import { useMyEvents } from '../../api/queries';
import type { EventSummary } from '../../api/types';
import { MeetupRow } from '../../components/MeetupRow';
import { Page, PageTitle } from '../../components/Page';
import type { Tone } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { formatPrice, formatShortDate, formatTime, isPast, meetupsLabel } from '../../lib/format';
import styles from './MyPages.module.css';

function eventStatus(e: EventSummary): { tone: Tone; label: string } {
  if (e.status === 'Cancelled') return { tone: 'error', label: 'Отменено' };
  if (isPast(e.startsAt, e.endsAt)) return { tone: 'neutral', label: 'Завершено' };
  return { tone: 'success', label: 'Опубликовано' };
}

export function MyEventsPage() {
  const location = useLocation();
  const created = (location.state as { created?: string } | null)?.created;
  const [bannerVisible, setBannerVisible] = useState(!!created);
  const events = useMyEvents();
  const list = events.data ?? [];

  return (
    <Page>
      <PageTitle
        title="Мои события"
        subtitle="События, которые вы опубликовали как организатор"
        action={<Button size="l" icon={Plus} to="/events/new">Новое событие</Button>}
      />

      {bannerVisible && created && (
        <div className={styles.banner} role="status">
          <span className={styles.bannerIcon}>
            <CheckCircle2 size={26} />
          </span>
          <div className={styles.bannerText}>
            <span className="t-h4">Событие опубликовано</span>
            <span className="t-body-m c-secondary">«{created}» уже на карте — пользователи могут собирать на него компании</span>
          </div>
          <button type="button" className={styles.bannerClose} onClick={() => setBannerVisible(false)} aria-label="Скрыть">
            <X size={18} />
          </button>
        </div>
      )}

      {events.isPending ? (
        <Spinner />
      ) : events.isError ? (
        <ErrorState message={events.error.message} onRetry={() => events.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          framed
          icon={Ticket}
          title="Вы ещё не публиковали события"
          text="Расскажите о концерте, лекции или встрече клуба — событие сразу появится на карте"
          action={<Button size="l" icon={Plus} to="/events/new">Опубликовать событие</Button>}
        />
      ) : (
        <div className={styles.list}>
          <div className={styles.group}>
            {list.map((e) => {
              const past = isPast(e.startsAt, e.endsAt);
              return (
                <MeetupRow
                  key={e.id}
                  to={`/?event=${e.id}`}
                  date={e.startsAt}
                  category={e.category}
                  status={eventStatus(e)}
                  title={e.title}
                  meta={`${formatShortDate(e.startsAt)}, ${formatTime(e.startsAt)} · ${e.venueName} · ${formatPrice(e.price).toLowerCase()}`}
                  aside={meetupsLabel(e.meetupsCount, e.participantsCount)}
                  action={<Button variant="secondary" to={`/?event=${e.id}`}>Открыть</Button>}
                  dimmed={past}
                />
              );
            })}
          </div>
        </div>
      )}
    </Page>
  );
}
