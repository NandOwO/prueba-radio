export interface AppConfig {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  sessionTtlHours: number;
  cookieSecure: boolean;
  youtubeApiKey: string | undefined;
  youtubeDailyQuota: number;
  searchCacheHours: number;
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
  };
}
