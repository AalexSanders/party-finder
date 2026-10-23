import type { Tone } from '../components/ui/Badges';
import type { Meetup } from '../api/types';

export const meetupLink = (id: string) => `${window.location.origin}/meetups/${id}`;

export function meetupStatus(m: Meetup, past: boolean): { tone: Tone; label: string } {
  if (m.status === 'Cancelled') return { tone: 'error', label: 'Отменена' };
  if (past) return { tone: 'neutral', label: 'Завершена' };
  if (m.participantsCount >= m.maxParticipants) return { tone: 'warning', label: 'Мест нет' };
  return { tone: 'success', label: 'Набор открыт' };
}
