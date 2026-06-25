export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  databaseUrl: string;
  databaseSsl: boolean;
  databaseSynchronize: boolean;
  typeormLogging: boolean;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  defaultCurrencyCode: string;
  defaultTimezone: string;
  syncMaxBatchSize: number;
}

function asBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function asNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function validateEnv(config: Record<string, unknown>): AppConfig {
  return {
    nodeEnv: asString(config.NODE_ENV, 'development'),
    port: asNumber(config.PORT as string | undefined, 3000),
    apiPrefix: asString(config.API_PREFIX, 'api/v1'),
    corsOrigins: asString(config.CORS_ORIGINS, '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: asString(
      config.DATABASE_URL,
      'postgresql://postgres:postgres@localhost:5432/flowfi',
    ),
    databaseSsl: asBoolean(config.DATABASE_SSL as string | undefined, false),
    databaseSynchronize: asBoolean(
      config.DATABASE_SYNCHRONIZE as string | undefined,
      false,
    ),
    typeormLogging: asBoolean(
      config.TYPEORM_LOGGING as string | undefined,
      false,
    ),
    jwtAccessSecret: asString(
      config.JWT_ACCESS_SECRET,
      'dev-access-secret-change-me',
    ),
    jwtAccessExpiresIn: asString(config.JWT_ACCESS_EXPIRES_IN, '15m'),
    jwtRefreshSecret: asString(
      config.JWT_REFRESH_SECRET,
      'dev-refresh-secret-change-me',
    ),
    jwtRefreshExpiresIn: asString(config.JWT_REFRESH_EXPIRES_IN, '30d'),
    defaultCurrencyCode: asString(config.DEFAULT_CURRENCY_CODE, 'VND'),
    defaultTimezone: asString(config.DEFAULT_TIMEZONE, 'Asia/Ho_Chi_Minh'),
    syncMaxBatchSize: asNumber(
      config.SYNC_MAX_BATCH_SIZE as string | undefined,
      100,
    ),
  };
}
