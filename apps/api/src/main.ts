import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

config({ path: resolve(__dirname, '../../../.env') });

function firstValidationMessage(errors: ValidationError[]): string {
  for (const err of errors) {
    const constraints = err.constraints ? Object.values(err.constraints) : [];
    if (constraints.length) return constraints[0]!;
    if (err.children?.length) {
      const nested = firstValidationMessage(err.children);
      if (nested) return nested;
    }
  }
  return 'البيانات المرسلة غير صالحة';
}

function toArabicValidationMessage(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('should not exist') || msg.includes('whitelist')) {
    return 'حقل غير مسموح في الطلب';
  }
  if (msg.includes('must be a string') || msg.includes('should be a string')) {
    return 'قيمة نصية مطلوبة';
  }
  if (msg.includes('must be a number') || msg.includes('should be a number')) {
    return 'قيمة رقمية مطلوبة';
  }
  if (msg.includes('must be an email') || msg.includes('email')) {
    return 'البريد الإلكتروني غير صالح';
  }
  if (msg.includes('should not be empty') || msg.includes('must not be empty')) {
    return 'هذا الحقل مطلوب';
  }
  if (msg.includes('must be longer') || msg.includes('minlength')) {
    return 'القيمة قصيرة جداً';
  }
  // Keep already-Arabic / custom messages from DTOs.
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  return 'البيانات المرسلة غير صالحة';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true }));

  const isProd = process.env.NODE_ENV === 'production';
  const allowLocalhostCors =
    !isProd || process.env.ALLOW_LOCALHOST_CORS === 'true';

  // Desktop (Tauri) origins — always allowed. `tauri:dev` uses http://localhost:1420;
  // packaged builds use https://tauri.localhost / tauri://localhost.
  const desktopOrigins = [
    'http://localhost:1420',
    'http://127.0.0.1:1420',
    'tauri://localhost',
    'https://tauri.localhost',
    'http://tauri.localhost',
  ];

  const defaultOrigins = [
    'https://omsp-web.onrender.com',
    'https://omsp.onrender.com',
    ...desktopOrigins,
    ...(allowLocalhostCors
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : []),
  ];
  const envOrigins = (process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .filter(
      (o) =>
        allowLocalhostCors ||
        desktopOrigins.includes(o) ||
        !/localhost|127\.0\.0\.1/i.test(o),
    );

  app.enableCors({
    origin: [...new Set([...defaultOrigins, ...envOrigins])],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(
          toArabicValidationMessage(firstValidationMessage(errors)),
        ),
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://0.0.0.0:${port}`);
}

bootstrap();
