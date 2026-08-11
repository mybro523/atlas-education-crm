export interface AppConfig {
  port: number;
  corsOrigin: string;
  defaultLanguage: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  redis: {
    host: string;
    port: number;
  };
  sms: {
    apiUrl: string;
    apiKey: string;
    sender: string;
  };
  meta: {
    appSecret: string;
    verifyToken: string;
    whatsappPhoneNumberId: string;
    whatsappAccessToken: string;
    instagramAccountId: string;
    instagramAccessToken: string;
  };
  telegram: {
    botToken: string;
  };
}

const isProd = process.env.NODE_ENV === 'production';

/**
 * Resolve a required secret. In production a missing/blank value is fatal — we
 * throw at startup rather than silently boot with a publicly-known default
 * (which would let anyone forge tokens). In development a marked fallback keeps
 * the DX friction-free.
 */
function requiredSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }
  if (isProd) {
    throw new Error(
      `Missing required environment variable ${name}. Refusing to start in production with an insecure default.`,
    );
  }
  // eslint-disable-next-line no-console
  console.warn(`[config] ${name} is not set — using an INSECURE dev fallback. Do NOT use in production.`);
  return devFallback;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'ru',
  jwt: {
    accessSecret: requiredSecret('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  sms: {
    apiUrl: process.env.PAYOM_TJ_API_URL ?? '',
    apiKey: process.env.PAYOM_TJ_API_KEY ?? '',
    sender: process.env.PAYOM_TJ_SENDER ?? 'AtlasCRM',
  },
  meta: {
    appSecret: process.env.META_APP_SECRET ?? '',
    verifyToken: process.env.META_VERIFY_TOKEN ?? '',
    whatsappPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID ?? '',
    whatsappAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ?? '',
    instagramAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID ?? '',
    instagramAccessToken: process.env.META_INSTAGRAM_ACCESS_TOKEN ?? '',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  },
});
