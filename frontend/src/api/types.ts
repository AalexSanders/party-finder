// Типы ответов API — повторяют DTO бэкенда (backend/PartyFinder.Api).

export type EventCategory = 'Music' | 'Art' | 'Sport' | 'Party' | 'Food' | 'Cinema';
export type EventStatus = 'Published' | 'Cancelled';
export type MeetupVisibility = 'Public' | 'LinkOnly';
export type MeetupStatus = 'Active' | 'Cancelled';
export type MyMeetupsScope = 'Organizing' | 'Participating' | 'Past';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface EventSummary {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  startsAt: string;
  endsAt: string | null;
  price: number | null;
  venueName: string;
  address: string;
  latitude: number;
  longitude: number;
  meetupsCount: number;
  participantsCount: number;
}

export interface EventDetails extends EventSummary {
  description: string;
  ticketUrl: string | null;
  organizerName: string;
  isMine: boolean;
}

export interface UserBrief {
  id: string;
  name: string;
}

export interface EventBrief {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string | null;
  venueName: string;
  address: string;
}

export interface Meetup {
  id: string;
  event: EventBrief;
  title: string;
  description: string | null;
  meetingTime: string;
  meetingPoint: string;
  maxParticipants: number;
  participantsCount: number;
  visibility: MeetupVisibility;
  status: MeetupStatus;
  cancelReason: string | null;
  organizer: UserBrief;
  participantsPreview: UserBrief[];
  isOrganizer: boolean;
  isParticipant: boolean;
}

export interface Participant {
  userId: string;
  name: string;
  phone: string | null;
  isOrganizer: boolean;
  joinedAt: string;
}

export interface MeetupDetails {
  meetup: Meetup;
  participants: Participant[];
}

export interface MyMeetupsCounts {
  organizing: number;
  participating: number;
  past: number;
}

export interface SaveMeetupRequest {
  title: string;
  description: string | null;
  meetingTime: string;
  meetingPoint: string;
  maxParticipants: number;
  visibility: MeetupVisibility;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string | null;
  price: number | null;
  ticketUrl: string | null;
  venueName: string;
  address: string;
  latitude: number;
  longitude: number;
  organizerName: string | null;
}

export interface EventFilters {
  categories: EventCategory[];
  from?: string;
  to?: string;
  q?: string;
  bounds?: { south: number; west: number; north: number; east: number };
}
