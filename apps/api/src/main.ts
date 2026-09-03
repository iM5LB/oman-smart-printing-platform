import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProd = process.env.NODE_ENV === 'production';
  const allowLocalhostCors =
    !isProd || process.env.ALLOW_LOCALHOST_CORS === 'true';

  const defaultOrigins = [
    'https://omsp-web.onrender.com',
    'https://omsp.onrender.com',
    ...(allowLocalhostCors
      ? [
          'http://localhost:3000',
          'http://localhost:1420',
          'http://127.0.0.1:1420',
          'http://tauri.localhost',
        ]
      : []),
    'tauri://localhost',
    'https://tauri.localhost',
  ];
  const envOrigins = (process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .filter((o) => allowLocalhostCors || !/localhost|127\.0\.0\.1/i.test(o));

  app.enableCors({
    origin: [...new Set([...defaultOrigins, ...envOrigins])],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://0.0.0.0:${port}`);
  console.log('Library setup unlock: POST /api/v1/library/setup/unlock');
}

bootstrap();
