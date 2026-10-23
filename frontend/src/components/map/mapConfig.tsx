import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import type { EventCategory } from '../../api/types';
import { CATEGORIES } from '../../lib/categories';

export const CITY_CENTER: [number, number] = [56.838, 60.6];
// Стандартные тайлы OSM без ключа; цвета приглушаем в map.css, чтобы пины читались как в макете.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>';
export const LEAFLET_PREFIX = '<a href="https://leafletjs.com">Leaflet</a>';

const iconCache = new Map<string, L.DivIcon>();

/** Пин категории из Figma (компонент Map Pin): цветной круг с иконкой, выбранный — крупнее и с ореолом. */
export function pinIcon(category: EventCategory, selected = false) {
  const key = `${category}:${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const { icon: Icon, color } = CATEGORIES[category];
    const size = selected ? 48 : 36;
    const svg = renderToStaticMarkup(<Icon size={selected ? 22 : 17} color="#fff" strokeWidth={2.25} />);
    icon = L.divIcon({
      className: '',
      html: `<div class="pf-pin${selected ? ' pf-pin--selected' : ''}" style="--pin:${color}">${svg}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

export const userIcon = L.divIcon({ className: '', html: '<div class="pf-user"><span></span></div>', iconSize: [48, 48], iconAnchor: [24, 24] });
