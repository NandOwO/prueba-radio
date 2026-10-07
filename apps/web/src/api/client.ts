let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

/** Renueva la sesión con la cookie httpOnly. Devuelve el usuario o null si ya no hay sesión. */
export async function refreshSession(): Promise<{ user: unknown } | null> {
  const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    setAccessToken(null);
    return null;
  }
  const body = (await res.json()) as { accessToken: string; user: unknown };
  setAccessToken(body.accessToken);
  return { user: body.user };
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  if (res.status === 401 && retry && !isAuthCall && (await refreshSession())) {
    return apiFetch<T>(path, init, false);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      details?: Record<string, unknown>;
    };
    throw new ApiRequestError(res.status, body.code ?? 'generic', body.details);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
