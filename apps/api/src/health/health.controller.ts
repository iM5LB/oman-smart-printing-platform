import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  @Get()
  async check() {
    let database: 'ok' | 'error' = 'ok';
    let database_error: string | undefined;
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch (err) {
      database = 'error';
      database_error =
        err instanceof Error ? err.message.slice(0, 200) : 'unknown database error';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      features: ['library-setup'],
      database,
      ...(database_error ? { database_error } : {}),
    };
  }
}
