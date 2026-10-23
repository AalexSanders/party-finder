import { Activity, Film, Music, Palette, Sparkles, Utensils, type LucideIcon } from 'lucide-react';
import type { EventCategory } from '../api/types';

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  /** Градиент обложки-заглушки (компонент Event Cover в Figma). */
  gradient: [string, string];
}

export const CATEGORIES: Record<EventCategory, CategoryMeta> = {
  Music: { label: 'Концерты', icon: Music, color: '#7C5CFF', gradient: ['#7C5CFF', '#B9A6FF'] },
  Art: { label: 'Выставки', icon: Palette, color: '#0EA5A4', gradient: ['#0EA5A4', '#7DD9C9'] },
  Sport: { label: 'Спорт', icon: Activity, color: '#22A55B', gradient: ['#22A55B', '#9BDB8A'] },
  Party: { label: 'Вечеринки', icon: Sparkles, color: '#EC4899', gradient: ['#EC4899', '#FFA6C9'] },
  Food: { label: 'Гастро', icon: Utensils, color: '#F97316', gradient: ['#F97316', '#FFC27A'] },
  Cinema: { label: 'Кино', icon: Film, color: '#3B82F6', gradient: ['#3B82F6', '#9CC3FF'] },
};

export const CATEGORY_ORDER: EventCategory[] = ['Music', 'Art', 'Sport', 'Party', 'Food', 'Cinema'];
