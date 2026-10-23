import { useState } from 'react';
import { Link2, Map as MapIcon, Users } from 'lucide-react';
import { useMyMeetups, useMyMeetupsCounts } from '../../api/queries';
import type { MyMeetupsScope } from '../../api/types';
import { EventCover } from '../../components/EventCard';
import { MeetupRow } from '../../components/MeetupRow';
import { Card, Page, PageTitle } from '../../components/Page';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Controls';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { addDays, cityDay, formatShortDate, formatTime, relativeDay } from '../../lib/format';
import { meetupLink, meetupStatus } from '../../lib/meetups';
import styles from './MyPages.module.css';

const EMPTY: Record<MyMeetupsScope, { title: string; text: string }> = {
  Organizing: { title: 'Вы пока не собирали компанию', text: 'Выберите событие на карте и создайте встречу — к вам смогут присоединиться' },
  Participating: { title: 'Вы пока никуда не записаны', text: 'Выберите событие на карте и присоединитесь к компании — или создайте свою встречу' },
  Past: { title: 'Прошедших встреч пока нет', text: 'Здесь появятся встречи, на которых вы уже побывали' },
};

/** Группировка по неделям, как в макете: «Эта неделя», «Следующая неделя», «Позже». */
function groupLabel(iso: string) {
  const today = cityDay(new Date());
  const weekday = (new Date(`${today}T12:00:00+05:00`).getUTCDay() + 6) % 7;
  const endOfWeek = addDays(today, 6 - weekday);
  const day = cityDay(new Date(iso));
  if (day <= endOfWeek) return 'Эта неделя';
  if (day <= addDays(endOfWeek, 7)) return 'Следующая неделя';
  return 'Позже';
}

export function MyMeetupsPage() {
  const toast = useToast();
  const [scope, setScope] = useState<MyMeetupsScope>('Organizing');
  const counts = useMyMeetupsCounts();
  const meetups = useMyMeetups(scope);
  const upcoming = useMyMeetups('Participating');
  const organizing = useMyMeetups('Organizing');

  const next = [...(organizing.data ?? []), ...(upcoming.data ?? [])]
    .filter((m) => m.status === 'Active')
    .sort((a, b) => a.meetingTime.localeCompare(b.meetingTime))[0];

  const copyInvite = async (id: string) => {
    const ok = await navigator.clipboard?.writeText(meetupLink(id)).then(() => true, () => false);
    toast({ type: ok ? 'success' : 'error', message: ok ? 'Ссылка-приглашение скопирована' : 'Не удалось скопировать ссылку' });
  };

  const list = meetups.data ?? [];
  const groups = scope === 'Past' ? [['', list] as const] : Object.entries(Object.groupBy(list, (m) => groupLabel(m.meetingTime)));

  return (
    <Page>
      <PageTitle
        title="Мои встречи"
        subtitle="Встречи, которые вы организуете или на которые записались"
        action={<Button size="l" icon={MapIcon} to="/">Найти событие</Button>}
      />
      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: 'Organizing', label: 'Я организую', count: counts.data?.organizing },
          { value: 'Participating', label: 'Я участвую', count: counts.data?.participating },
          { value: 'Past', label: 'Прошедшие' },
        ]}
      />

      {meetups.isPending ? (
        <Spinner />
      ) : meetups.isError ? (
        <ErrorState message={meetups.error.message} onRetry={() => meetups.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState framed icon={Users} {...EMPTY[scope]} action={<Button size="l" icon={MapIcon} to="/">Открыть карту</Button>} />
      ) : (
        <div className={styles.columns}>
          <div className={styles.list}>
            {groups.map(([label, items]) => (
              <div key={label} className={styles.group}>
                {label && <span className="t-overline c-tertiary">{label}</span>}
                {items!.map((m) => (
                  <MeetupRow
                    key={m.id}
                    to={`/meetups/${m.id}`}
                    date={m.meetingTime}
                    category={m.event.category}
                    status={meetupStatus(m, scope === 'Past')}
                    title={m.title}
                    meta={`${formatShortDate(m.meetingTime)}, ${formatTime(m.meetingTime)} · ${m.event.title} · ${m.meetingPoint}`}
                    people={{ names: m.participantsPreview.map((p) => p.name), label: `${m.participantsCount} из ${m.maxParticipants}` }}
                    action={<Button variant="secondary" to={`/meetups/${m.id}`}>Открыть</Button>}
                    dimmed={m.status === 'Cancelled' || scope === 'Past'}
                  />
                ))}
              </div>
            ))}
          </div>
          {next && scope !== 'Past' && (
            <Card padding={20} className={styles.side}>
              <span className="t-overline c-tertiary">Ближайшая встреча</span>
              <EventCover category={next.event.category} style={{ height: 140 }} />
              <div className={styles.sideText}>
                <h3 className="t-h3">{capitalize(relativeDay(next.meetingTime, null))}</h3>
                <p className="t-body-m c-secondary">
                  {formatShortDate(next.meetingTime)} · сбор в {formatTime(next.meetingTime)}, {next.meetingPoint}
                </p>
                <p className="t-body-s c-tertiary">{next.title}</p>
              </div>
              <Button variant="secondary" icon={Link2} block onClick={() => copyInvite(next.id)}>
                Скопировать приглашение
              </Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
