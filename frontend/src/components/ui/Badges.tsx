import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { EventCategory } from '../../api/types';
import { CATEGORIES } from '../../lib/categories';
import { initials } from '../../lib/format';
import styles from './Badges.module.css';

export function CategoryBadge({ category }: { category: EventCategory }) {
  const { label, icon: Icon, color } = CATEGORIES[category];
  return (
    <span className={styles.category} style={{ color, background: `${color}1f` }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

export type Tone = 'success' | 'warning' | 'error' | 'neutral' | 'brand';

export function StatusPill({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

interface ChipProps {
  active?: boolean;
  icon?: LucideIcon;
  onClick?: () => void;
  children: ReactNode;
}

export function Chip({ active, icon: Icon, onClick, children }: ChipProps) {
  return (
    <button type="button" className={`${styles.chip} ${active ? styles.chipActive : ''}`} onClick={onClick} aria-pressed={active}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

// Палитра аватаров из Figma: цвет выбирается по имени, чтобы у человека он был одинаковым везде.
const AVATAR_COLORS: [string, string][] = [
  ['#EEEAFF', '#5B3FF5'],
  ['#FFE4D6', '#C2410C'],
  ['#DCF5E7', '#15803D'],
  ['#DBEAFE', '#1D4ED8'],
  ['#FCE7F3', '#BE185D'],
];

function avatarColors(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 'm' }: { name: string; size?: 's' | 'm' | 'l' | 'xl' }) {
  const [bg, fg] = avatarColors(name);
  return (
    <span className={`${styles.avatar} ${styles[`avatar-${size}`]}`} style={{ background: bg, color: fg }} title={name}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 'm' }: { names: string[]; size?: 's' | 'm' }) {
  return (
    <span className={styles.stack}>
      {names.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
    </span>
  );
}
