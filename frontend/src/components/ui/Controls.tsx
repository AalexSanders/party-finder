import type { ReactNode } from 'react';
import { Check, Minus, Plus, type LucideIcon } from 'lucide-react';
import styles from './Controls.module.css';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.segmented} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`${styles.segment} ${o.value === value ? styles.segmentActive : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  error,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <div className={styles.stepperField}>
      <span className={styles.label}>{label}</span>
      <div className={styles.stepper}>
        <button type="button" aria-label="Меньше" disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={18} />
        </button>
        <span className={styles.stepperValue} aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label="Больше" disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={18} />
        </button>
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

export function RadioCard({
  selected,
  title,
  description,
  icon: Icon,
  onSelect,
  name,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon?: LucideIcon;
  onSelect: () => void;
  name: string;
}) {
  return (
    <label className={`${styles.radioCard} ${selected ? styles.radioSelected : ''}`}>
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="visually-hidden" />
      {Icon && (
        <span className={styles.radioIcon}>
          <Icon size={18} />
        </span>
      )}
      <span className={styles.radioText}>
        <span className="t-body-m-medium">{title}</span>
        <span className="t-caption c-tertiary">{description}</span>
      </span>
      <span className={styles.radio} />
    </label>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="visually-hidden" />
      <span className={`${styles.box} ${checked ? styles.boxOn : ''}`}>{checked && <Check size={14} strokeWidth={3} />}</span>
      <span>{children}</span>
    </label>
  );
}
