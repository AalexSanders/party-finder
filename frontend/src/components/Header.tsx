import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { LogOut, Map as MapIcon, MapPin, Plus, Ticket, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './ui/Badges';
import { Button } from './ui/Button';
import styles from './Header.module.css';

export function Logo({ inverse }: { inverse?: boolean }) {
  return (
    <Link to="/" className={`${styles.logo} ${inverse ? styles.logoInverse : ''}`}>
      <span className={styles.mark}>
        <MapPin size={19} />
      </span>
      Куда?
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`;

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnTo = encodeURIComponent(location.pathname + location.search);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Logo />
        <nav className={styles.nav}>
          <NavLink to="/" end className={navClass}>
            <MapIcon size={18} />
            Карта
          </NavLink>
          {user && (
            <>
              <NavLink to="/my/meetups" className={navClass}>
                <Users size={18} />
                Мои встречи
              </NavLink>
              <NavLink to="/my/events" className={navClass}>
                <Ticket size={18} />
                Мои события
              </NavLink>
            </>
          )}
        </nav>
      </div>
      <div className={styles.right}>
        {user ? (
          <>
            <Button variant="secondary" icon={Plus} to="/events/new">
              Опубликовать событие
            </Button>
            <div className={styles.menuWrap} ref={menuRef}>
              <button type="button" className={styles.avatarBtn} onClick={() => setMenuOpen((v) => !v)} aria-label="Профиль">
                <Avatar name={user.name} size="l" />
              </button>
              {menuOpen && (
                <div className={styles.menu}>
                  <div className={styles.menuUser}>
                    <span className="t-body-m-medium">{user.name}</span>
                    <span className="t-caption c-tertiary">{user.email}</span>
                  </div>
                  <button type="button" className={styles.menuItem} onClick={logout}>
                    <LogOut size={16} />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" to={`/login?returnTo=${returnTo}`}>
              Войти
            </Button>
            <Button to={`/register?returnTo=${returnTo}`}>Регистрация</Button>
          </>
        )}
      </div>
    </header>
  );
}
