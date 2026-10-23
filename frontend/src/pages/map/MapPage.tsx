import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { LatLngBounds } from 'leaflet';
import { Calendar, ChevronDown, Search, X } from 'lucide-react';
import { useEvents } from '../../api/queries';
import type { EventCategory, EventFilters } from '../../api/types';
import { EventCard } from '../../components/EventCard';
import { EventsMap } from '../../components/map/EventsMap';
import { Chip } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { CATEGORIES, CATEGORY_ORDER } from '../../lib/categories';
import { addDays, cityDay, dayEnd, dayStart, plural } from '../../lib/format';
import { EventDetailsPanel } from './EventDetailsPanel';
import styles from './MapPage.module.css';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'date';

const PANEL_INSET = 16 + 420;
const DETAILS_INSET = 16 + 400;

function dateRange(filter: DateFilter, customDay: string): Pick<EventFilters, 'from' | 'to'> {
  const today = cityDay(new Date());
  switch (filter) {
    case 'today':
      return { from: new Date().toISOString(), to: dayEnd(today) };
    case 'tomorrow':
      return { from: dayStart(addDays(today, 1)), to: dayEnd(addDays(today, 1)) };
    case 'weekend': {
      // Ближайшие суббота и воскресенье; в выходной — с сегодняшнего дня.
      const weekday = new Date(`${today}T12:00:00+05:00`).getUTCDay();
      const toSaturday = weekday === 0 ? -1 : 6 - weekday;
      const saturday = addDays(today, toSaturday);
      return { from: weekday === 0 || weekday === 6 ? new Date().toISOString() : dayStart(saturday), to: dayEnd(addDays(saturday, 1)) };
    }
    case 'date':
      return customDay ? { from: dayStart(customDay), to: dayEnd(customDay) } : {};
    default:
      return {};
  }
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MapPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('event') ?? undefined;

  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDay, setCustomDay] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [bounds, setBounds] = useState<EventFilters['bounds']>();
  const [movedBounds, setMovedBounds] = useState<LatLngBounds | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);

  const q = useDebounced(query, 300);
  const filters = useMemo<EventFilters>(
    () => ({ categories, q, bounds, ...dateRange(dateFilter, customDay) }),
    [categories, q, bounds, dateFilter, customDay],
  );
  const events = useEvents(filters);
  const list = events.data ?? [];

  const select = (id: string | null) =>
    setParams((p) => {
      if (id) p.set('event', id);
      else p.delete('event');
      return p;
    });

  // Карточка выбранного события в списке — всегда на виду.
  useEffect(() => {
    if (selectedId) document.querySelector(`[data-event-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, events.data]);

  const toggleCategory = (c: EventCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const pickDate = (f: DateFilter) => {
    if (f === 'date') {
      dateInput.current?.showPicker?.();
      if (!dateInput.current?.showPicker) dateInput.current?.focus();
      return;
    }
    setDateFilter((cur) => (cur === f ? 'all' : f));
  };

  const searchArea = () => {
    if (!movedBounds) return;
    setBounds({ south: movedBounds.getSouth(), west: movedBounds.getWest(), north: movedBounds.getNorth(), east: movedBounds.getEast() });
    setMovedBounds(null);
  };

  const resetFilters = () => {
    setQuery('');
    setDateFilter('all');
    setCustomDay('');
    setCategories([]);
    setBounds(undefined);
  };

  const locate = () => {
    if (!navigator.geolocation) return toast({ type: 'error', message: 'Браузер не поддерживает геолокацию' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => toast({ type: 'error', message: 'Не удалось определить местоположение' }),
      { timeout: 10000 },
    );
  };

  const hasFilters = categories.length > 0 || dateFilter !== 'all' || !!q.trim() || !!bounds;
  const insets = { left: PANEL_INSET, right: selectedId ? DETAILS_INSET : 0 };

  return (
    <div className={styles.body}>
      <EventsMap
        events={list}
        selectedId={selectedId}
        onSelect={select}
        onUserMove={setMovedBounds}
        insets={insets}
        userPosition={userPosition}
        onLocate={locate}
      />

      {movedBounds && (
        <div className={styles.searchArea} style={{ left: `calc((${insets.left}px + 100% - ${insets.right}px) / 2)` }}>
          <Button variant="dark" icon={Search} onClick={searchArea}>
            Искать в этой области
          </Button>
        </div>
      )}

      <section className={styles.panel} aria-label="Мероприятия">
        <div className={styles.panelTop}>
          <h1 className="t-h2">Куда сходить</h1>
          <TextField
            icon={Search}
            placeholder="Поиск мероприятий и мест"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск"
          />
          <div className={styles.group}>
            <span className="t-overline c-tertiary">Когда</span>
            <div className={styles.chips}>
              <Chip active={dateFilter === 'today'} onClick={() => pickDate('today')}>Сегодня</Chip>
              <Chip active={dateFilter === 'tomorrow'} onClick={() => pickDate('tomorrow')}>Завтра</Chip>
              <Chip active={dateFilter === 'weekend'} onClick={() => pickDate('weekend')}>Выходные</Chip>
              <span className={styles.dateChip}>
                <Chip active={dateFilter === 'date'} icon={Calendar} onClick={() => (dateFilter === 'date' ? setDateFilter('all') : pickDate('date'))}>
                  {dateFilter === 'date' && customDay ? new Date(`${customDay}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Дата'}
                </Chip>
                <input
                  ref={dateInput}
                  type="date"
                  className={styles.hiddenDate}
                  min={cityDay(new Date())}
                  value={customDay}
                  onChange={(e) => {
                    setCustomDay(e.target.value);
                    setDateFilter(e.target.value ? 'date' : 'all');
                  }}
                  tabIndex={-1}
                  aria-hidden
                />
              </span>
            </div>
          </div>
          <div className={styles.group}>
            <span className="t-overline c-tertiary">Категории</span>
            <div className={`${styles.chips} ${styles.scroller}`}>
              <Chip active={categories.length === 0} onClick={() => setCategories([])}>Все</Chip>
              {CATEGORY_ORDER.map((c) => (
                <Chip key={c} icon={CATEGORIES[c].icon} active={categories.includes(c)} onClick={() => toggleCategory(c)}>
                  {CATEGORIES[c].label}
                </Chip>
              ))}
            </div>
          </div>
          <hr className={styles.divider} />
          <div className={styles.resultsHead}>
            <span className="t-h4">
              {events.isPending ? 'Ищем события…' : `${list.length} ${plural(list.length, 'событие', 'события', 'событий')}`}
            </span>
            {bounds ? (
              <button type="button" className={styles.areaReset} onClick={() => setBounds(undefined)}>
                В этой области
                <X size={14} />
              </button>
            ) : (
              <span className={styles.sort}>
                Сначала ближайшие
                <ChevronDown size={16} />
              </span>
            )}
          </div>
        </div>

        <div className={styles.list}>
          {events.isPending ? (
            <Spinner />
          ) : events.isError ? (
            <ErrorState message={events.error.message} onRetry={() => events.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Ничего не нашлось"
              text={hasFilters ? 'Попробуйте другую дату, категорию или сдвиньте карту' : 'Скоро здесь появятся события'}
              action={hasFilters && <Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button>}
            />
          ) : (
            list.map((e) => <EventCard key={e.id} event={e} selected={e.id === selectedId} onClick={() => select(e.id)} />)
          )}
        </div>
      </section>

      {selectedId && <EventDetailsPanel key={selectedId} eventId={selectedId} onClose={() => select(null)} />}
    </div>
  );
}
