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

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'ru',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
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
