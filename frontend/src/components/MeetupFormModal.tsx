import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Clock, MapPin } from 'lucide-react';
import { ApiError } from '../api/client';
import { useCreateMeetup, useUpdateMeetup } from '../api/queries';
import type { EventBrief, Meetup, MeetupVisibility, SaveMeetupRequest } from '../api/types';
import { formatEventWhen, fromLocalInput, toLocalInput } from '../lib/format';
import { meetupLink } from '../lib/meetups';
import { EventCover } from './EventCard';
import { Button } from './ui/Button';
import { RadioCard, Stepper } from './ui/Controls';
import { Alert } from './ui/Feedback';
import { TextArea, TextField } from './ui/Field';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import styles from './MeetupFormModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  event: EventBrief;
  /** Если передана — режим редактирования. */
  meetup?: Meetup;
}

/** Создание и редактирование встречи (экраны 04–05 в Figma). */
export function MeetupFormModal(props: Props) {
  // Ключ пересоздаёт форму при каждом открытии, чтобы не тащить старые значения и ошибки.
  return props.open ? <MeetupForm key={props.meetup?.id ?? props.event.id} {...props} /> : null;
}

function defaultMeetingTime(event: EventBrief) {
  const start = new Date(event.startsAt).getTime();
  const halfHourBefore = start - 30 * 60_000;
  // Для уже идущих событий (выставки) предлагаем ближайший час.
  const value = halfHourBefore > Date.now() ? halfHourBefore : Math.ceil(Date.now() / 3600_000) * 3600_000 + 3600_000;
  return toLocalInput(new Date(value).toISOString());
}

function MeetupForm({ onClose, event, meetup }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateMeetup(event.id);
  const update = useUpdateMeetup(meetup?.id ?? '');
  const mutation = meetup ? update : create;

  const [title, setTitle] = useState(meetup?.title ?? '');
  const [meetingTime, setMeetingTime] = useState(meetup ? toLocalInput(meetup.meetingTime) : defaultMeetingTime(event));
  const [meetingPoint, setMeetingPoint] = useState(meetup?.meetingPoint ?? '');
  const [description, setDescription] = useState(meetup?.description ?? '');
  const [maxParticipants, setMaxParticipants] = useState(meetup?.maxParticipants ?? 6);
  const [visibility, setVisibility] = useState<MeetupVisibility>(meetup?.visibility ?? 'Public');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (title.trim().length < 3) local.title = 'Введите название встречи';
    if (!meetingPoint.trim()) local.meetingPoint = 'Укажите место сбора';
    if (!meetingTime) local.meetingTime = 'Укажите время сбора';
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError('Заполните обязательные поля, чтобы создать встречу');
      return;
    }

    const req: SaveMeetupRequest = {
      title: title.trim(),
      description: description.trim() || null,
      meetingTime: fromLocalInput(meetingTime),
      meetingPoint: meetingPoint.trim(),
      maxParticipants,
      visibility,
    };
    try {
      const result = await mutation.mutateAsync(req);
      onClose();
      if (meetup) {
        toast({ type: 'success', message: 'Изменения сохранены' });
      } else {
        const copied = await navigator.clipboard?.writeText(meetupLink(result.meetup.id)).then(() => true, () => false);
        toast({
          type: 'success',
          message: copied ? 'Встреча создана — ссылка скопирована' : 'Встреча создана',
          action: { label: 'Открыть', onClick: () => navigate(`/meetups/${result.meetup.id}`) },
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={meetup ? 'Редактирование встречи' : 'Новая встреча'}
      subtitle={meetup ? undefined : 'Соберите компанию на мероприятие — встреча появится на странице события'}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.event}>
          <EventCover category={event.category} size={48} />
          <div className={styles.eventText}>
            <span className="t-body-m-medium">{event.title}</span>
            <span className="t-caption c-tertiary">
              {formatEventWhen(event.startsAt, event.endsAt)} · {event.venueName}
            </span>
          </div>
        </div>

        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Название встречи *"
          placeholder="Например, «Идём компанией на джаз»"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          maxLength={120}
          autoFocus
        />
        <div className={styles.row}>
          <TextField
            label="Время сбора *"
            type="datetime-local"
            icon={Clock}
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            error={errors.meetingTime}
          />
          <TextField
            label="Место сбора *"
            icon={MapPin}
            placeholder="Где встречаемся?"
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            error={errors.meetingPoint}
            maxLength={200}
          />
        </div>
        <TextArea
          label="Описание"
          placeholder="Расскажите о встрече: что планируете до и после события…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          error={errors.description}
        />
        <div className={styles.settings}>
          <Stepper
            label="Участников, включая вас"
            value={maxParticipants}
            min={Math.max(2, meetup?.participantsCount ?? 2)}
            max={50}
            onChange={setMaxParticipants}
            error={errors.maxParticipants}
          />
          <div className={styles.visibility}>
            <span className="t-caption c-secondary">Кто может присоединиться</span>
            <div className={styles.radios}>
              <RadioCard
                name="visibility"
                selected={visibility === 'Public'}
                onSelect={() => setVisibility('Public')}
                title="Все"
                description="Видна на странице события"
              />
              <RadioCard
                name="visibility"
                selected={visibility === 'LinkOnly'}
                onSelect={() => setVisibility('LinkOnly')}
                title="По ссылке"
                description="Только у кого есть ссылка"
              />
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="l" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" size="l" loading={mutation.isPending}>
            {meetup ? 'Сохранить' : 'Создать встречу'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
