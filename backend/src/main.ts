import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the unparsed request buffer so the Meta webhook can
  // verify its X-Hub-Signature-256 HMAC against the exact bytes Meta signed.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  // Flush in-flight work (Prisma, BullMQ, Telegraf) on SIGTERM/SIGINT so a
  // Railway redeploy shuts down cleanly instead of dropping connections.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: config.get<string>('corsOrigin') ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Atlas CRM backend is running on http://localhost:${port}/api`);
}

void bootstrap();
