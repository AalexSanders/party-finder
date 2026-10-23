# Party Finder — фронтенд

React 19 + Vite + TypeScript. Вёрстка по макету в Figma, токены дизайна — в `src/styles/tokens.css`.

```bash
npm install
npm run dev      # http://localhost:5173, /api проксируется на http://localhost:5080
npm run build    # проверка типов и сборка в dist/
```

API должен быть запущен (см. корневой README). Другой адрес API: `API_URL=http://host:port npm run dev`.

## Структура

| Папка | Что внутри |
|---|---|
| `src/api` | fetch-клиент, типы DTO, хуки TanStack Query |
| `src/auth` | контекст авторизации (JWT в localStorage) |
| `src/components/ui` | базовые компоненты из Figma: Button, поля, Chip, бейджи, Modal, Toast |
| `src/components` | доменные компоненты: карточки событий и встреч, шапка, карта |
| `src/pages` | экраны: карта, мои встречи, встреча, мои события, новое событие, вход/регистрация |
| `src/lib` | форматирование дат (время Екатеринбурга), категории |
