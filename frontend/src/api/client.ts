const TOKEN_KEY = 'pf.token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Приватный режим или запрещённое хранилище — сессия просто не переживёт перезагрузку.
    }
  },
};

/** Ошибка API в формате ProblemDetails: title — текст для пользователя, fields — ошибки полей формы. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, title: string, fields: Record<string, string> = {}) {
    super(title);
    this.status = status;
    this.fields = fields;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Вызывается, когда сервер отклонил токен (истёк или пользователь удалён). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStorage.get();
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз');
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    const fields: Record<string, string> = {};
    for (const [key, messages] of Object.entries((data?.errors ?? {}) as Record<string, string[]>)) {
      if (messages.length) fields[key] = messages[0];
    }
    const title = data?.title && !Object.keys(fields).length ? data.title : defaultMessage(response.status, fields);
    throw new ApiError(response.status, title, fields);
  }
  return data as T;
}

function defaultMessage(status: number, fields: Record<string, string>) {
  if (Object.keys(fields).length) return 'Проверьте поля формы';
  if (status === 401) return 'Войдите, чтобы продолжить';
  if (status === 403) return 'Недостаточно прав';
  if (status === 404) return 'Не найдено';
  return 'Что-то пошло не так. Попробуйте ещё раз';
}
