import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AttributionControl, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { Calendar, Check, Clock, Eye, Globe, Link2, MapPin, Ticket } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useCreateEvent } from '../../api/queries';
import type { CreateEventRequest, EventCategory, EventSummary } from '../../api/types';
import { EventCard } from '../../components/EventCard';
import 'leaflet/dist/leaflet.css';
import '../../components/map/map.css';
import { CITY_CENTER, LEAFLET_PREFIX, TILE_ATTRIBUTION, TILE_URL, pinIcon } from '../../components/map/mapConfig';
import { Card, Page, PageTitle } from '../../components/Page';
import { Button } from '../../components/ui/Button';
import { RadioCard } from '../../components/ui/Controls';
import { Alert } from '../../components/ui/Feedback';
import { SelectField, TextArea, TextField } from '../../components/ui/Field';
import { CATEGORIES, CATEGORY_ORDER } from '../../lib/categories';
import { addDays, cityDay } from '../../lib/format';
import styles from './NewEventPage.module.css';

const OFFSET = '+05:00';

function ClickToPick({ onPick }: { onPick: (v: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function LocationPicker({ value, category, onChange }: { value: [number, number] | null; category: EventCategory; onChange: (v: [number, number]) => void }) {
  return (
    <div className={styles.mapBox}>
      <MapContainer center={value ?? CITY_CENTER} zoom={13} className={styles.map} scrollWheelZoom={false} attributionControl={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <AttributionControl prefix={LEAFLET_PREFIX} />
        <ClickToPick onPick={onChange} />
        {value && (
          <Marker
            position={value}
            icon={pinIcon(category, true)}
            draggable
            eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange([p.lat, p.lng]); } }}
          />
        )}
      </MapContainer>
      {!value && <span className={styles.mapHint}>Нажмите на карту, чтобы отметить место</span>}
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <Card>
      <div className={styles.sectionHead}>
        <span className={styles.step}>{step}</span>
        <h2 className="t-h3">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export function NewEventPage() {
  const navigate = useNavigate();
  const create = useCreateEvent();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Music');
  const [organizerName, setOrganizerName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(addDays(cityDay(new Date()), 7));
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const startsAt = date && startTime ? `${date}T${startTime}:00${OFFSET}` : '';
  // Окончание раньше начала — значит, событие заканчивается после полуночи.
  const endsAt = useMemo(() => {
    if (!startsAt || !endTime) return null;
    const endDay = endTime <= startTime ? addDays(date, 1) : date;
    return `${endDay}T${endTime}:00${OFFSET}`;
  }, [startsAt, endTime, startTime, date]);

  const checklist = [
    { ok: title.trim().length >= 3, label: 'Название и категория' },
    { ok: description.trim().length >= 50, label: 'Описание от 50 символов' },
    { ok: !!startsAt && new Date(startsAt) > new Date(), label: 'Дата и время' },
    { ok: !!venueName.trim() && !!address.trim() && !!location, label: 'Место и точка на карте' },
  ];

  const preview: EventSummary = {
    id: 'preview',
    title: title.trim() || 'Название события',
    category,
    status: 'Published',
    startsAt: startsAt || new Date().toISOString(),
    endsAt,
    price: paid && Number(price) > 0 ? Number(price) : null,
    venueName: venueName.trim() || 'Место проведения',
    address,
    latitude: 0,
    longitude: 0,
    meetupsCount: 0,
    participantsCount: 0,
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (title.trim().length < 3) local.title = 'Введите название';
    if (description.trim().length < 50) local.description = 'Описание — от 50 символов';
    if (!startsAt || new Date(startsAt) <= new Date()) local.startsAt = 'Дата начала должна быть в будущем';
    if (!venueName.trim()) local.venueName = 'Укажите место';
    if (!address.trim()) local.address = 'Укажите адрес';
    if (!location) local.location = 'Отметьте место на карте';
    if (paid && !(Number(price) > 0)) local.price = 'Укажите цену';
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError('Проверьте поля формы — некоторые не заполнены');
      window.scrollTo({ top: 0 });
      return;
    }

    const req: CreateEventRequest = {
      title: title.trim(),
      description: description.trim(),
      category,
      startsAt,
      endsAt,
      price: paid ? Number(price) : null,
      ticketUrl: paid && ticketUrl.trim() ? ticketUrl.trim() : null,
      venueName: venueName.trim(),
      address: address.trim(),
      latitude: location![0],
      longitude: location![1],
      organizerName: organizerName.trim() || null,
    };
    try {
      await create.mutateAsync(req);
      navigate('/my/events', { state: { created: req.title } });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      }
    }
  };

  return (
    <Page>
      <PageTitle title="Новое событие" subtitle="Заполните информацию — событие сразу появится на карте" />
      <form className={styles.columns} onSubmit={submit} noValidate>
        <div className={styles.form}>
          {formError && <Alert>{formError}</Alert>}

          <Section step={1} title="Основное">
            <TextField label="Название события *" placeholder="Например, лекция «Город будущего»" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={200} />
            <div className={styles.row}>
              <SelectField label="Категория *" icon={CATEGORIES[category].icon} value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIES[c].label}
                  </option>
                ))}
              </SelectField>
              <TextField label="Организатор" placeholder="Площадка, клуб или ваше имя" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} maxLength={200} />
            </div>
            <TextArea label="Описание *" placeholder="Что будет, для кого, что взять с собой…" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} maxLength={4000} rows={4} />
          </Section>

          <Section step={2} title="Дата и время">
            <div className={styles.row3}>
              <TextField label="Дата *" type="date" icon={Calendar} min={cityDay(new Date())} value={date} onChange={(e) => setDate(e.target.value)} error={errors.startsAt} />
              <TextField label="Начало *" type="time" icon={Clock} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <TextField label="Окончание" type="time" icon={Clock} value={endTime} onChange={(e) => setEndTime(e.target.value)} error={errors.endsAt}
                hint={endTime && endTime <= startTime ? 'На следующий день' : undefined} />
            </div>
          </Section>

          <Section step={3} title="Место">
            <div className={styles.row}>
              <TextField label="Название места *" placeholder="Библиотека им. Белинского" value={venueName} onChange={(e) => setVenueName(e.target.value)} error={errors.venueName} maxLength={200} />
              <TextField label="Адрес *" icon={MapPin} placeholder="ул. Белинского, 15" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} maxLength={300} />
            </div>
            <LocationPicker value={location} category={category} onChange={setLocation} />
            {errors.location && <span className="t-caption c-error">{errors.location}</span>}
          </Section>

          <Section step={4} title="Стоимость">
            <div className={styles.row}>
              <RadioCard name="price" selected={!paid} onSelect={() => setPaid(false)} title="Бесплатно" description="Вход свободный или по регистрации" icon={Globe} />
              <RadioCard name="price" selected={paid} onSelect={() => setPaid(true)} title="Платно" description="Укажите цену и ссылку на билеты" icon={Ticket} />
            </div>
            {paid && (
              <div className={styles.row}>
                <TextField label="Цена от, ₽ *" type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} />
                <TextField label="Ссылка на билеты" icon={Link2} type="url" placeholder="https://" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} error={errors.ticketUrl} />
              </div>
            )}
          </Section>

          <div className={styles.actions}>
            <Button variant="ghost" size="l" onClick={() => navigate(-1)}>
              Отмена
            </Button>
            <Button type="submit" size="l" loading={create.isPending}>
              Опубликовать
            </Button>
          </div>
        </div>

        <aside className={styles.preview}>
          <span className={styles.previewLabel}>
            <Eye size={16} />
            <span className="t-overline">Так событие увидят на карте</span>
          </span>
          <EventCard event={preview} showMeetups={false} />
          <Card padding={20} gap={12}>
            <h3 className="t-h4">Перед публикацией</h3>
            {checklist.map((c) => (
              <span key={c.label} className={styles.check}>
                <span className={`${styles.checkMark} ${c.ok ? styles.checkOk : ''}`}>{c.ok && <Check size={12} strokeWidth={3} />}</span>
                <span className={c.ok ? undefined : 'c-tertiary'}>{c.label}</span>
              </span>
            ))}
          </Card>
        </aside>
      </form>
    </Page>
  );
}
