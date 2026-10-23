import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Lock, Mail, Phone, User, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from '../../components/Header';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Controls';
import { Alert } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { CATEGORIES } from '../../lib/categories';
import type { EventCategory } from '../../api/types';
import styles from './AuthPages.module.css';

/** Куда вернуть пользователя после входа: только относительные пути внутри приложения. */
function useReturnTo() {
  const [params] = useSearchParams();
  const raw = params.get('returnTo') ?? '/';
  const returnTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  return { returnTo, query: raw !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : '' };
}

const DECOR_PINS: [EventCategory, number, number][] = [
  ['Music', 160, 560],
  ['Food', 420, 500],
  ['Sport', 300, 700],
  ['Party', 520, 660],
  ['Art', 90, 720],
];

function AuthLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { returnTo } = useReturnTo();
  return (
    <div className={styles.screen}>
      <aside className={styles.brand}>
        <div className={styles.brandMap} />
        {DECOR_PINS.map(([c, x, y]) => {
          const Icon = CATEGORIES[c].icon;
          return (
            <span key={c} className={styles.pin} style={{ left: x, top: y, background: CATEGORIES[c].color }}>
              <Icon size={17} color="#fff" />
            </span>
          );
        })}
        <div className={styles.brandLogo}>
          <Logo inverse />
        </div>
        <div className={styles.headline}>
          <h1 className="t-display">Находите события и компанию на вечер</h1>
          <p className="t-body-l">Концерты, выставки, спорт и вечеринки — на одной карте. Создавайте встречи и собирайтесь вместе.</p>
        </div>
      </aside>
      <main className={styles.formSide}>
        <button type="button" className={styles.close} onClick={() => navigate(returnTo)} aria-label="Закрыть">
          <X size={18} />
        </button>
        <div className={styles.form}>{children}</div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { returnTo, query } = useReturnTo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to={returnTo} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!email.trim()) local.email = 'Введите email';
    if (!password) local.password = 'Введите пароль';
    setFields(local);
    setError(null);
    if (Object.keys(local).length) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
      if (err instanceof ApiError && err.status === 401) setFields({ password: 'Неверный пароль' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className={styles.formInner} onSubmit={submit} noValidate>
        <div className={styles.head}>
          <h1 className="t-h1">С возвращением</h1>
          <p className="t-body-l c-secondary">Войдите, чтобы создавать встречи и присоединяться к ним</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <TextField label="Email" type="email" icon={Mail} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} autoFocus />
        <TextField label="Пароль" type="password" icon={Lock} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} />
        <Button type="submit" size="l" block loading={loading}>
          Войти
        </Button>
        <p className={styles.switch}>
          Нет аккаунта? <Link to={`/register${query}`} className="link">Зарегистрироваться</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { returnTo, query } = useReturnTo();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to={returnTo} replace />;

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (form.name.trim().length < 2) local.name = 'Введите имя';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) local.email = 'Некорректный email';
    if (form.password.length < 8) local.password = 'Минимум 8 символов';
    else if (!/[a-zа-яё]/i.test(form.password) || !/\d/.test(form.password)) local.password = 'Пароль должен содержать буквы и цифры';
    setFields(local);
    setError(Object.keys(local).length ? null : !accepted ? 'Примите условия использования, чтобы продолжить' : null);
    if (Object.keys(local).length || !accepted) return;
    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, password: form.password });
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(Object.keys(err.fields).length ? null : err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className={styles.formInner} onSubmit={submit} noValidate>
        <div className={styles.head}>
          <h1 className="t-h1">Создать аккаунт</h1>
          <p className="t-body-l c-secondary">Зарегистрируйтесь, чтобы создавать встречи и публиковать события</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <TextField label="Имя" icon={User} autoComplete="name" value={form.name} onChange={set('name')} error={fields.name} autoFocus />
        <TextField label="Email" type="email" icon={Mail} autoComplete="email" value={form.email} onChange={set('email')} error={fields.email} />
        <TextField label="Телефон (необязательно)" type="tel" icon={Phone} autoComplete="tel" placeholder="+7 (___) ___-__-__" value={form.phone} onChange={set('phone')} error={fields.phone}
          hint="Увидят только участники ваших встреч" />
        <TextField label="Пароль" type="password" icon={Lock} autoComplete="new-password" value={form.password} onChange={set('password')} error={fields.password}
          hint="Минимум 8 символов, буквы и цифры" />
        <Checkbox checked={accepted} onChange={setAccepted}>Принимаю условия использования</Checkbox>
        <Button type="submit" size="l" block loading={loading}>
          Зарегистрироваться
        </Button>
        <p className={styles.switch}>
          Уже есть аккаунт? <Link to={`/login${query}`} className="link">Войти</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
