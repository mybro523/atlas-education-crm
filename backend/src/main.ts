import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the unparsed request buffer so the Meta webhook can
  // verify its X-Hub-Signature-256 HMAC against the exact bytes Meta signed.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  // Behind Railway's edge proxy every request reaches Express from the proxy's
  // address; without trusting the first hop, req.ip never reflects the real
  // client, so the per-IP login throttle silently never triggered in
  // production (verified live: unlimited brute-force attempts all got 401,
  // never 429). Trust exactly one hop — the platform proxy.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  // Flush in-flight work (Prisma, BullMQ, Telegraf) on SIGTERM/SIGINT so a
  // Railway redeploy shuts down cleanly instead of dropping connections.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  // Prisma constraint errors → proper HTTP codes instead of raw 500s.
  app.useGlobalFilters(new PrismaExceptionFilter());

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
