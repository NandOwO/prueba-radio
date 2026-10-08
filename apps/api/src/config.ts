export interface AppConfig {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  sessionTtlHours: number;
  cookieSecure: boolean;
  youtubeApiKey: string | undefined;
  youtubeDailyQuota: number;
  searchCacheHours: number;
  requestLimit: { windowMinutes: number; maxInWindow: number; cooldownMinutes: number };
  /** Roles asignados por ID de socio del ERP. Provisional hasta el panel de administración (Fase 6). */
  roleOverrides: Record<string, 'display' | 'staff' | 'admin'>;
}

/** Lee la configuración del entorno. Falla al arrancar si falta el secreto JWT en producción. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET ?? (isProduction ? '' : 'dev-only-secret-change-me');
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET debe tener al menos 16 caracteres');
  }
  return {
    jwtSecret,
    accessTokenTtlSeconds: Number(env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 12),
    cookieSecure: isProduction,
    youtubeApiKey: env.YOUTUBE_API_KEY || undefined,
    // Límite diario propio por debajo de los 10 000 de YouTube, como margen de seguridad.
    youtubeDailyQuota: Number(env.YOUTUBE_DAILY_QUOTA ?? 9000),
    searchCacheHours: Number(env.SEARCH_CACHE_HOURS ?? 24),
    roleOverrides: parseRoleOverrides(env),
    requestLimit: {
      windowMinutes: Number(env.REQUEST_WINDOW_MINUTES ?? 30),
      maxInWindow: Number(env.REQUEST_MAX_IN_WINDOW ?? 5),
      cooldownMinutes: Number(env.REQUEST_COOLDOWN_MINUTES ?? 6),
    },
  };
}

function parseRoleOverrides(env: NodeJS.ProcessEnv): AppConfig['roleOverrides'] {
  const overrides: AppConfig['roleOverrides'] = {};
  const sources: [string | undefined, 'display' | 'staff' | 'admin'][] = [
    [env.DISPLAY_MEMBER_IDS, 'display'],
    [env.STAFF_MEMBER_IDS, 'staff'],
    [env.ADMIN_MEMBER_IDS, 'admin'],
  ];
  for (const [list, role] of sources) {
    for (const id of (list ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)) {
      overrides[id] = role;
    }
  }
  return overrides;
}
