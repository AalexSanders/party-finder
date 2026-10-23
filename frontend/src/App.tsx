import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { SearchX } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { Header } from './components/Header';
import { Page } from './components/Page';
import { Button } from './components/ui/Button';
import { EmptyState, Spinner } from './components/ui/Feedback';
import { LoginPage, RegisterPage } from './pages/auth/AuthPages';
import { MapPage } from './pages/map/MapPage';
import { MeetupPage } from './pages/meetup/MeetupPage';
import { MyEventsPage } from './pages/my/MyEventsPage';
import { MyMeetupsPage } from './pages/my/MyMeetupsPage';
import { NewEventPage } from './pages/events/NewEventPage';
import styles from './App.module.css';

function Layout() {
  return (
    <div className={styles.app}>
      <Header />
      <Outlet />
    </div>
  );
}

/** Страницы только для вошедших: гостя отправляем на вход и возвращаем обратно. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

function NotFound() {
  return (
    <Page>
      <EmptyState framed icon={SearchX} title="Страница не найдена" text="Возможно, ссылка устарела" action={<Button to="/">На карту</Button>} />
    </Page>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="meetups/:id" element={<MeetupPage />} />
        <Route path="my/meetups" element={<RequireAuth><MyMeetupsPage /></RequireAuth>} />
        <Route path="my/events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
        <Route path="events/new" element={<RequireAuth><NewEventPage /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
    </Routes>
  );
}
