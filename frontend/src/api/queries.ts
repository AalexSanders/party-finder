import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  CreateEventRequest,
  EventDetails,
  EventFilters,
  EventSummary,
  Meetup,
  MeetupDetails,
  MyMeetupsCounts,
  MyMeetupsScope,
  SaveMeetupRequest,
} from './types';

export const keys = {
  events: (filters?: EventFilters) => ['events', filters] as const,
  event: (id: string) => ['event', id] as const,
  eventMeetups: (id: string) => ['event', id, 'meetups'] as const,
  meetup: (id: string) => ['meetup', id] as const,
  myMeetups: (scope: MyMeetupsScope) => ['my', 'meetups', scope] as const,
  myMeetupsCounts: ['my', 'meetups', 'counts'] as const,
  myEvents: ['my', 'events'] as const,
};

function toQuery(filters: EventFilters) {
  const params = new URLSearchParams();
  filters.categories.forEach((c) => params.append('category', c));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.bounds) {
    const { south, west, north, east } = filters.bounds;
    Object.entries({ south, west, north, east }).forEach(([k, v]) => params.set(k, v.toFixed(5)));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: keys.events(filters),
    queryFn: () => api<EventSummary[]>('GET', `/events${toQuery(filters)}`),
    // При смене фильтров старый список остаётся на экране, пока грузится новый.
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: keys.event(id ?? ''),
    queryFn: () => api<EventDetails>('GET', `/events/${id}`),
    enabled: !!id,
  });
}

export function useEventMeetups(id: string | undefined) {
  return useQuery({
    queryKey: keys.eventMeetups(id ?? ''),
    queryFn: () => api<Meetup[]>('GET', `/events/${id}/meetups`),
    enabled: !!id,
  });
}

export function useMeetup(id: string | undefined) {
  return useQuery({
    queryKey: keys.meetup(id ?? ''),
    queryFn: () => api<MeetupDetails>('GET', `/meetups/${id}`),
    enabled: !!id,
  });
}

export function useMyMeetups(scope: MyMeetupsScope) {
  return useQuery({
    queryKey: keys.myMeetups(scope),
    queryFn: () => api<Meetup[]>('GET', `/meetups/mine?scope=${scope}`),
  });
}

export function useMyMeetupsCounts() {
  return useQuery({
    queryKey: keys.myMeetupsCounts,
    queryFn: () => api<MyMeetupsCounts>('GET', '/meetups/mine/counts'),
  });
}

export function useMyEvents() {
  return useQuery({ queryKey: keys.myEvents, queryFn: () => api<EventSummary[]>('GET', '/events/mine') });
}

/** После любого изменения встречи обновляем всё, где она может отображаться. */
function useMeetupMutation<TVars>(fn: (vars: TVars) => Promise<MeetupDetails>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(keys.meetup(data.meetup.id), data);
      qc.invalidateQueries({ queryKey: ['event', data.meetup.event.id] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['my', 'meetups'] });
    },
  });
}

export const useCreateMeetup = (eventId: string) =>
  useMeetupMutation((req: SaveMeetupRequest) => api<MeetupDetails>('POST', `/events/${eventId}/meetups`, req));

export const useUpdateMeetup = (id: string) =>
  useMeetupMutation((req: SaveMeetupRequest) => api<MeetupDetails>('PUT', `/meetups/${id}`, req));

export const useJoinMeetup = () => useMeetupMutation((id: string) => api<MeetupDetails>('POST', `/meetups/${id}/join`));

export const useLeaveMeetup = () => useMeetupMutation((id: string) => api<MeetupDetails>('POST', `/meetups/${id}/leave`));

export const useCancelMeetup = (id: string) =>
  useMeetupMutation((reason: string | null) => api<MeetupDetails>('POST', `/meetups/${id}/cancel`, { reason }));

export const useRemoveParticipant = (id: string) =>
  useMeetupMutation((userId: string) => api<MeetupDetails>('DELETE', `/meetups/${id}/participants/${userId}`));

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateEventRequest) => api<EventDetails>('POST', '/events', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: keys.myEvents });
    },
  });
}
