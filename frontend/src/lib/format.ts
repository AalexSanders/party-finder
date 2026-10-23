// Все даты показываем во времени Екатеринбурга — сервис городской, события привязаны к месту.
export const CITY_TZ = 'Asia/Yekaterinburg';
const CITY_OFFSET = '+05:00';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', { timeZone: CITY_TZ, ...opts });
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit' });
const shortDateFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const longDateFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const dayFmt = fmt({ day: '2-digit' });
const monthFmt = fmt({ month: 'short' });
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: CITY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

const clean = (s: string) => s.replace('.', '').replace(/^./, (c) => c.toUpperCase());

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

/** «Сб, 26 окт» */
export const formatShortDate = (iso: string) => clean(shortDateFmt.format(new Date(iso)));

/** «Суббота, 26 октября» */
export const formatLongDate = (iso: string) => clean(longDateFmt.format(new Date(iso)));

/** Дата-блок в списках: { day: '26', month: 'ОКТ' } */
export const dateBlock = (iso: string) => ({
  day: dayFmt.format(new Date(iso)),
  month: monthFmt.format(new Date(iso)).replace('.', '').toUpperCase(),
});

/** Календарный день в городе: '2026-10-26'. */
export const cityDay = (date: Date) => ymdFmt.format(date);

/** Начало/конец дня в городе в ISO с часовым поясом. */
export const dayStart = (ymd: string) => `${ymd}T00:00:00${CITY_OFFSET}`;
export const dayEnd = (ymd: string) => `${ymd}T23:59:59${CITY_OFFSET}`;

export const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00${CITY_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return cityDay(d);
};

/** Значение для <input type="datetime-local"> во времени города. */
export function toLocalInput(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** Обратно из <input type="datetime-local"> в ISO с часовым поясом города. */
export const fromLocalInput = (value: string) => `${value}:00${CITY_OFFSET}`;

const isSameDay = (a: string, b: string) => cityDay(new Date(a)) === cityDay(new Date(b));

/** Дата события для карточки: «Сб, 26 окт · 19:00» или «До 30 нояб» для длинных. */
export function formatEventWhen(startsAt: string, endsAt: string | null) {
  if (endsAt && !isSameDay(startsAt, endsAt)) {
    const days = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86400_000;
    if (days > 3) {
      const started = new Date(startsAt) <= new Date();
      return started ? `Ежедневно до ${fmt({ day: 'numeric', month: 'short' }).format(new Date(endsAt)).replace('.', '')}` : `${formatShortDate(startsAt)} — ${formatShortDate(endsAt)}`;
    }
    return `${formatShortDate(startsAt)} – ${formatShortDate(endsAt)} · ${formatTime(startsAt)}`;
  }
  return `${formatShortDate(startsAt)} · ${formatTime(startsAt)}`;
}

/** «через 2 дня», «сегодня», «завтра», «идёт сейчас» */
export function relativeDay(startsAt: string, endsAt: string | null) {
  const now = new Date();
  if (new Date(startsAt) <= now) return endsAt && new Date(endsAt) > now ? 'идёт сейчас' : 'прошло';
  const diff = Math.round(
    (new Date(`${cityDay(new Date(startsAt))}T12:00:00Z`).getTime() - new Date(`${cityDay(now)}T12:00:00Z`).getTime()) / 86400_000,
  );
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  return `через ${diff} ${plural(diff, 'день', 'дня', 'дней')}`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const priceFmt = new Intl.NumberFormat('ru-RU');

export const formatPrice = (price: number | null) => (price === null ? 'Бесплатно' : `от ${priceFmt.format(price)} ₽`);

export function meetupsLabel(meetups: number, people: number) {
  if (!meetups) return 'Пока нет встреч';
  return `${meetups} ${plural(meetups, 'встреча', 'встречи', 'встреч')} · ${people} ${plural(people, 'идёт', 'идут', 'идут')}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export const isPast = (startsAt: string, endsAt: string | null) => new Date(endsAt ?? startsAt) < new Date();
