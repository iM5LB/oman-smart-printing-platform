import { Body, Controller, Inject, Post } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';
import { generateDeviceToken, hashDeviceToken } from '../websocket/shop.gateway';

@Controller('devices')
export class DevicesController {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  @Post('register')
  async register(@Body() body: { store_slug: string; name: string }) {
    const store = await this.db.store.findUnique({ where: { slug: body.store_slug } });
    if (!store) return { error: 'Store not found' };

    const token = generateDeviceToken();
    const device = await this.db.device.create({
      data: {
        storeId: store.id,
        name: body.name,
        tokenHash: hashDeviceToken(token),
      },
    });

    return {
      device_id: device.id,
      device_token: token,
      ws_url: `ws://localhost:${process.env.API_PORT ?? 4000}/ws/shop`,
    };
  }
}
