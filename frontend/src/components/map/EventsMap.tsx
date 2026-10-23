import { useEffect, useMemo, useRef } from 'react';
import { AttributionControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { EventSummary } from '../../api/types';
import { CITY_CENTER, LEAFLET_PREFIX, TILE_ATTRIBUTION, TILE_URL, pinIcon, userIcon } from './mapConfig';
import './map.css';

/** Отступы видимой части карты: слева панель списка, справа — панель события. */
export interface MapInsets {
  left: number;
  right: number;
}

interface Props {
  events: EventSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Пользователь сам подвигал карту (не программный перелёт к событию). */
  onUserMove?: (bounds: LatLngBounds) => void;
  insets: MapInsets;
  userPosition?: [number, number] | null;
  onLocate?: () => void;
}

export function EventsMap({ events, selectedId, onSelect, onUserMove, insets, userPosition, onLocate }: Props) {
  return (
    <MapContainer center={CITY_CENTER} zoom={13} zoomControl={false} attributionControl={false} className="pf-map" minZoom={10} maxZoom={18}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <AttributionControl prefix={LEAFLET_PREFIX} />
      {events.map((e) => (
        <Marker
          key={e.id}
          position={[e.latitude, e.longitude]}
          icon={pinIcon(e.category, e.id === selectedId)}
          zIndexOffset={e.id === selectedId ? 1000 : 0}
          title={e.title}
          eventHandlers={{ click: () => onSelect(e.id) }}
        />
      ))}
      {userPosition && <Marker position={userPosition} icon={userIcon} interactive={false} />}
      <FollowSelection events={events} selectedId={selectedId} insets={insets} userPosition={userPosition} onUserMove={onUserMove} />
      <MapControls onLocate={onLocate} insets={insets} />
    </MapContainer>
  );
}

function FollowSelection({
  events,
  selectedId,
  insets,
  userPosition,
  onUserMove,
}: Pick<Props, 'events' | 'selectedId' | 'insets' | 'userPosition' | 'onUserMove'>) {
  const map = useMap();
  const programmatic = useRef(false);
  const selected = useMemo(() => events.find((e) => e.id === selectedId), [events, selectedId]);

  useMapEvents({
    moveend: () => {
      if (programmatic.current) programmatic.current = false;
      else onUserMove?.(map.getBounds());
    },
  });

  // Стартовый центр города — в середине видимой части, справа от панели списка.
  // Только при монтировании: дальше карту двигает пользователь.
  const initialLeftInset = useRef(insets.left);
  useEffect(() => {
    programmatic.current = true;
    map.panBy([-initialLeftInset.current / 2, 0], { animate: false });
  }, [map]);

  // Выбранное событие держим в видимой части карты, не под панелями.
  useEffect(() => {
    if (!selected) return;
    const latLng = L.latLng(selected.latitude, selected.longitude);
    const padTL = L.point(insets.left + 40, 100);
    const padBR = L.point(insets.right + 40, 60);
    const visible = L.bounds(padTL, map.getSize().subtract(padBR));
    if (!visible.contains(map.latLngToContainerPoint(latLng))) {
      programmatic.current = true;
      map.panInside(latLng, { paddingTopLeft: padTL, paddingBottomRight: padBR, animate: true });
    }
  }, [selected, insets.left, insets.right, map]);

  useEffect(() => {
    if (!userPosition) return;
    programmatic.current = true;
    map.flyTo(userPosition, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [userPosition, map]);

  return null;
}

function MapControls({ onLocate, insets }: { onLocate?: () => void; insets: MapInsets }) {
  const map = useMap();
  return (
    <div className="pf-map-controls" style={{ right: insets.right + 24 }} onDoubleClick={(e) => e.stopPropagation()}>
      <div className="pf-map-zoom">
        <button type="button" aria-label="Приблизить" onClick={() => map.zoomIn()}>
          <Plus size={18} />
        </button>
        <span className="pf-map-divider" />
        <button type="button" aria-label="Отдалить" onClick={() => map.zoomOut()}>
          <Minus size={18} />
        </button>
      </div>
      {onLocate && (
        <button type="button" className="pf-map-locate" aria-label="Где я" onClick={onLocate}>
          <LocateFixed size={18} />
        </button>
      )}
    </div>
  );
}
