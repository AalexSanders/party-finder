import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Calendar, ChevronRight, Globe, Link2, Lock, MapPin, Pencil, Plus, Share2, Trash2, Users, UserX, type LucideIcon } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useCancelMeetup, useJoinMeetup, useLeaveMeetup, useMeetup, useRemoveParticipant } from '../../api/queries';
import type { Participant } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { AuthGateModal } from '../../components/AuthGateModal';
import { EventCover } from '../../components/EventCard';
import { MeetupFormModal } from '../../components/MeetupFormModal';
import { Page } from '../../components/Page';
import { Avatar, CategoryBadge, StatusPill } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { TextArea, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatEventWhen, formatShortDate, formatTime, isPast, plural } from '../../lib/format';
import { meetupLink, meetupStatus } from '../../lib/meetups';
import styles from './MeetupPage.module.css';

export function MeetupPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const query = useMeetup(id);
  const join = useJoinMeetup();
  const leave = useLeaveMeetup();
  const cancel = useCancelMeetup(id);
  const remove = useRemoveParticipant(id);
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [gate, setGate] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast({ type: 'success', message: success });
    } catch (err) {
      toast({ type: 'error', message: err instanceof ApiError ? err.message : 'Что-то пошло не так' });
    }
  };

  const copyLink = async () => {
    const ok = await navigator.clipboard?.writeText(meetupLink(id)).then(() => true, () => false);
    toast({ type: ok ? 'success' : 'error', message: ok ? 'Ссылка-приглашение скопирована' : 'Не удалось скопировать ссылку' });
  };

  if (query.isPending) return <Page><Spinner /></Page>;
  if (query.isError) {
    return (
      <Page>
        {query.error instanceof ApiError && query.error.status === 404 ? (
          <EmptyState framed icon={Users} title="Встреча не найдена" text="Возможно, ссылка неверная или встречу удалили" action={<Button to="/">На карту</Button>} />
        ) : (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        )}
      </Page>
    );
  }

  const { meetup: m, participants } = query.data;
  const past = isPast(m.event.startsAt, m.event.endsAt);
  const cancelled = m.status === 'Cancelled';
  const free = m.maxParticipants - m.participantsCount;
  const status = meetupStatus(m, past);
  const canManage = m.isOrganizer && !cancelled && !past;

  return (
    <Page gap={20}>
      <Link to={user ? '/my/meetups' : '/'} className={styles.back}>
        <ArrowLeft size={16} />
        {user ? 'Мои встречи' : 'На карту'}
      </Link>

      <div className={styles.columns}>
        <article className={styles.main}>
          <EventCover category={m.event.category} className={styles.cover} />
          <div className={styles.body}>
            <div className={styles.tags}>
              <CategoryBadge category={m.event.category} />
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              {m.isOrganizer && <StatusPill tone="brand">Вы организатор</StatusPill>}
              {!m.isOrganizer && m.isParticipant && <StatusPill tone="brand">Вы участвуете</StatusPill>}
            </div>
            <h1 className="t-h1">{m.title}</h1>
            {cancelled && (
              <div className={styles.cancelled}>
                <span className="t-body-m-medium">Встреча отменена</span>
                {m.cancelReason && <span className="t-body-m">Причина: {m.cancelReason}</span>}
              </div>
            )}

            <Link to={`/?event=${m.event.id}`} className={styles.eventLink}>
              <EventCover category={m.event.category} size={44} />
              <span className={styles.eventText}>
                <span className="t-body-m-medium">{m.event.title}</span>
                <span className="t-caption c-tertiary">
                  {formatEventWhen(m.event.startsAt, m.event.endsAt)} · {m.event.venueName}
                </span>
              </span>
              <ChevronRight size={18} className="c-tertiary" />
            </Link>

            <div className={styles.grid}>
              <Info icon={Calendar} title={`${formatShortDate(m.meetingTime)}, ${formatTime(m.meetingTime)}`} sub="Время сбора" />
              <Info icon={MapPin} title={m.meetingPoint} sub={m.event.address} />
              <Info
                icon={m.visibility === 'Public' ? Globe : Lock}
                title={m.visibility === 'Public' ? 'Открытая встреча' : 'Встреча по ссылке'}
                sub={m.visibility === 'Public' ? 'Видна на странице события' : 'Присоединиться можно только по ссылке'}
              />
              <Info
                icon={Users}
                title={`До ${m.maxParticipants} ${plural(m.maxParticipants, 'участника', 'участников', 'участников')}`}
                sub={cancelled || past ? `Записалось ${m.participantsCount}` : free > 0 ? `Осталось ${free} ${plural(free, 'место', 'места', 'мест')}` : 'Мест нет'}
              />
            </div>

            {m.description && <p className="t-body-m c-secondary">{m.description}</p>}

            {!cancelled && !past && (
              <>
                <hr className={styles.divider} />
                <div className={styles.actions}>
                  {m.isOrganizer ? (
                    <>
                      <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Редактировать</Button>
                      <Button variant="secondary" icon={Share2} onClick={copyLink}>Поделиться</Button>
                      <span className={styles.spacer} />
                      <Button variant="danger" icon={Trash2} onClick={() => setCancelOpen(true)}>Отменить встречу</Button>
                    </>
                  ) : m.isParticipant ? (
                    <>
                      <Button variant="secondary" icon={Share2} onClick={copyLink}>Поделиться</Button>
                      <span className={styles.spacer} />
                      <Button variant="danger" icon={UserX} loading={leave.isPending} onClick={() => run(() => leave.mutateAsync(id), 'Вы вышли из встречи')}>
                        Выйти из встречи
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="l"
                        disabled={free <= 0}
                        loading={join.isPending}
                        onClick={() => (user ? run(() => join.mutateAsync(id), 'Вы присоединились к встрече') : setGate(true))}
                      >
                        {free > 0 ? 'Присоединиться' : 'Мест нет'}
                      </Button>
                      <Button variant="secondary" size="l" icon={Share2} onClick={copyLink}>Поделиться</Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </article>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className="t-h3">Участники</h2>
              <span className="t-body-m-medium c-secondary">
                {m.participantsCount} из {m.maxParticipants}
              </span>
            </div>
            <div className={styles.progress}>
              <span style={{ width: `${Math.min(100, (m.participantsCount / m.maxParticipants) * 100)}%` }} />
            </div>
            {participants.map((p) => (
              <ParticipantRow
                key={p.userId}
                participant={p}
                isMe={p.userId === user?.id}
                canRemove={canManage && !p.isOrganizer}
                onRemove={() => run(() => remove.mutateAsync(p.userId), `${p.name} удалён(а) из встречи`)}
              />
            ))}
            {free > 0 && !cancelled && (
              <div className={styles.slots}>
                <Plus size={16} />
                Ещё {free} {plural(free, 'свободное место', 'свободных места', 'свободных мест')}
              </div>
            )}
          </section>

          {m.isParticipant && !cancelled && !past && (
            <section className={styles.card}>
              <h3 className="t-h4">Пригласить друзей</h3>
              <p className="t-body-s c-secondary">Отправьте ссылку — по ней можно сразу присоединиться к встрече</p>
              <div className={styles.linkRow}>
                <TextField icon={Link2} value={meetupLink(id).replace(/^https?:\/\//, '')} readOnly aria-label="Ссылка" />
                <Button variant="dark" onClick={copyLink}>Копировать</Button>
              </div>
            </section>
          )}
        </aside>
      </div>

      <MeetupFormModal open={editing} onClose={() => setEditing(false)} event={m.event} meetup={m} />
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={m.title}
        others={m.participantsCount - 1}
        loading={cancel.isPending}
        onConfirm={async (reason) => {
          await run(() => cancel.mutateAsync(reason), 'Встреча отменена');
          setCancelOpen(false);
        }}
      />
      <AuthGateModal open={gate} onClose={() => setGate(false)} />
    </Page>
  );
}

function Info({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  return (
    <div className={styles.info}>
      <span className={styles.infoIcon}>
        <Icon size={18} />
      </span>
      <span className={styles.infoText}>
        <span className="t-body-m-medium">{title}</span>
        <span className="t-caption c-tertiary">{sub}</span>
      </span>
    </div>
  );
}

function ParticipantRow({ participant: p, isMe, canRemove, onRemove }: { participant: Participant; isMe: boolean; canRemove: boolean; onRemove: () => void }) {
  return (
    <div className={styles.participant}>
      <Avatar name={p.name} size="l" />
      <span className={styles.participantText}>
        <span className="t-body-m-medium">{p.name}</span>
        <span className="t-caption c-tertiary">
          {p.isOrganizer ? 'Организатор' : `С ${formatShortDate(p.joinedAt).toLowerCase()}`}
          {p.phone && ` · ${p.phone}`}
        </span>
      </span>
      {isMe && <StatusPill tone="brand" dot={false}>Вы</StatusPill>}
      {canRemove && (
        <button type="button" className={styles.remove} onClick={onRemove}>
          Удалить
        </button>
      )}
    </div>
  );
}

function CancelDialog({
  open,
  onClose,
  title,
  others,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  others: number;
  loading: boolean;
  onConfirm: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} width={460} bare title="Отменить встречу?">
      <span className={styles.dangerIcon}>
        <Trash2 size={24} />
      </span>
      <div className={styles.dialogText}>
        <h2 className="t-h2">Отменить встречу?</h2>
        <p className="t-body-m c-secondary">
          {others > 0
            ? `${others} ${plural(others, 'участник увидит', 'участника увидят', 'участников увидят')}, что встреча «${title}» отменена. `
            : `Встреча «${title}» будет отменена. `}
          Это действие нельзя отменить.
        </p>
      </div>
      <TextArea
        label="Причина (необязательно)"
        placeholder="Например: заболел, перенесём на другой концерт"
        hint="Участники увидят этот комментарий"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={3}
      />
      <div className={styles.dialogActions}>
        <Button variant="secondary" size="l" block onClick={onClose}>
          Не отменять
        </Button>
        <Button variant="destructive" size="l" block loading={loading} onClick={() => onConfirm(reason.trim() || null)}>
          Да, отменить
        </Button>
      </div>
    </Modal>
  );
}
