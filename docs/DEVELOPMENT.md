# Разработка и запуск

Техническая документация проекта «Куда?». Описание продукта — в корневом [README](../README.md).

## Структура репозитория

| Папка | Что внутри |
|---|---|
| `backend/` | API на ASP.NET Core (.NET 10), EF Core + PostgreSQL |
| `frontend/` | React + Vite + TypeScript, карта на Leaflet + OpenStreetMap |
| `docker-compose.yml` | Три сервиса: `db` (PostgreSQL), `api` (бэкенд), `web` (фронтенд на nginx) |

## Быстрый старт (Docker)

Нужен только Docker (Docker Desktop на Windows/macOS). Всё приложение поднимается одной командой:

```bash
docker compose up --build
```

- **Сайт: http://localhost:8080** — nginx раздаёт фронтенд и проксирует `/api` на бэкенд
- API: http://localhost:5080, Swagger UI: http://localhost:5080/swagger
- Postgres: `localhost:5432`, база и пользователь — `partyfinder`, пароль — `POSTGRES_PASSWORD` из `.env`

Первая сборка занимает несколько минут (скачиваются образы .NET, Node и npm-пакеты).
Карта загружает тайлы OpenStreetMap, поэтому нужен интернет.

### Переменные окружения

Чтобы переопределить значения, создайте в корне проекта файл `.env` (он в `.gitignore`) с нужными переменными:

```dotenv
POSTGRES_PASSWORD=...
JWT_KEY=...
SEED_DEMO_DATA=true
```

Без `.env` compose берёт значения по умолчанию из `docker-compose.yml`, которые подходят только для локального запуска.
`POSTGRES_PASSWORD` применяется только при первой инициализации БД; после смены `JWT_KEY` пользователям нужно войти заново.

| Переменная | Назначение |
|---|---|
| `POSTGRES_PASSWORD` | Пароль пользователя БД |
| `JWT_KEY` | Секрет подписи JWT, не короче 32 символов |
| `SEED_DEMO_DATA` | Заполнять пустую БД демо-данными (`true`/`false`) |

### Демо-данные

При первом запуске API применяет миграции и, если включён `SEED_DEMO_DATA`, заполняет пустую БД
событиями и встречами по Екатеринбургу. Даты считаются от текущего дня, поэтому события всегда предстоящие.
Демо-аккаунты и их пароль задаются в `backend/PartyFinder.Api/Data/DbSeeder.cs`
(пароль можно переопределить переменной `Seed__DemoPassword` у сервиса `api`).

### Полезные команды

| Команда | Что делает |
|---|---|
| `docker compose up -d --build` | Запустить в фоне |
| `docker compose logs -f api` | Логи бэкенда |
| `docker compose down` | Остановить (данные сохраняются в volume) |
| `docker compose down -v` | Остановить и удалить данные — при следующем запуске БД заполнится демо-данными заново |

Если порты 8080, 5080 или 5432 заняты, поменяйте левую часть в `ports:` в `docker-compose.yml`.

## Разработка бэкенда без Docker для API

```bash
docker compose up -d db
cd backend
dotnet run --project PartyFinder.Api
```

API поднимется на http://localhost:5080 в окружении Development
(демо-данные и CORS для `http://localhost:5173` включены, настройки — в `appsettings.Development.json`).

### Новая миграция

```bash
cd backend
dotnet tool restore
dotnet ef migrations add <Name> --project PartyFinder.Api --output-dir Data/Migrations
```

Миграции применяются автоматически при старте API.

## Разработка фронтенда

```bash
cd frontend
npm install
npm run dev
```

Откроется на http://127.0.0.1:5173, запросы `/api` проксируются на API (http://localhost:5080).
Подробнее о структуре — [frontend/README.md](../frontend/README.md).

## API (кратко)

Все ответы — JSON, ошибки — ProblemDetails (`title` — текст для пользователя, `errors` — ошибки полей формы).
Авторизация — заголовок `Authorization: Bearer <token>`.

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация → `{ token, user }` |
| POST | `/api/auth/login` | Вход → `{ token, user }` |
| GET | `/api/auth/me` | Текущий пользователь 🔒 |
| GET | `/api/events` | События для карты: `south, west, north, east`, `category` (можно несколько), `from`, `to`, `q` |
| GET | `/api/events/{id}` | Карточка события |
| POST | `/api/events` | Опубликовать событие 🔒 (публикуется сразу, без модерации) |
| GET | `/api/events/mine` | Мои события 🔒 |
| GET | `/api/events/{id}/meetups` | Встречи на событие |
| POST | `/api/events/{id}/meetups` | Создать встречу 🔒 |
| GET | `/api/meetups/{id}` | Встреча с участниками (доступна по ссылке без входа) |
| PUT | `/api/meetups/{id}` | Изменить встречу 🔒 организатор |
| POST | `/api/meetups/{id}/cancel` | Отменить встречу 🔒 организатор |
| POST | `/api/meetups/{id}/join` · `/leave` | Присоединиться / выйти 🔒 |
| DELETE | `/api/meetups/{id}/participants/{userId}` | Удалить участника 🔒 организатор |
| GET | `/api/meetups/mine?scope=Organizing\|Participating\|Past` | Мои встречи 🔒 |
| GET | `/api/meetups/mine/counts` | Счётчики для вкладок «Мои встречи» 🔒 |

Полная схема — в Swagger UI.
