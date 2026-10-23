import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, ChevronDown, type LucideIcon } from 'lucide-react';
import styles from './Field.module.css';

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  /** Подпись справа под полем, например счётчик «86 / 500». */
  counter?: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, hint, error, counter, children, className }: FieldShellProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      {children}
      {(error || hint || counter) && (
        <div className={styles.below}>
          {(error || hint) && <span className={error ? styles.error : styles.hint}>{error ?? hint}</span>}
          {counter && <span className={styles.counter}>{counter}</span>}
        </div>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  className?: string;
}

export function TextField({ label, hint, error, icon: Icon, className, id, ...input }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <div className={[styles.control, error && styles.invalid].filter(Boolean).join(' ')}>
        {Icon && <Icon size={18} className={styles.icon} />}
        <input id={fieldId} className={styles.input} aria-invalid={!!error} {...input} />
        {error && <AlertCircle size={18} className={styles.errorIcon} />}
      </div>
    </FieldShell>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function TextArea({ label, hint, error, className, id, maxLength, value, ...rest }: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const counter = maxLength ? `${String(value ?? '').length} / ${maxLength}` : undefined;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} counter={counter} className={className}>
      <div className={[styles.control, styles.areaControl, error && styles.invalid].filter(Boolean).join(' ')}>
        <textarea id={fieldId} className={styles.textarea} maxLength={maxLength} value={value} aria-invalid={!!error} {...rest} />
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  className?: string;
}

export function SelectField({ label, hint, error, icon: Icon, className, id, children, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <div className={[styles.control, error && styles.invalid].filter(Boolean).join(' ')}>
        {Icon && <Icon size={18} className={styles.icon} />}
        <select id={fieldId} className={styles.select} {...rest}>
          {children}
        </select>
        <ChevronDown size={18} className={styles.icon} />
      </div>
    </FieldShell>
  );
}
