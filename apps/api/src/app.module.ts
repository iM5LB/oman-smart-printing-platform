import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { ThrottlerModule } from '@nestjs/throttler';

import { HealthModule } from './health/health.module';

import { StoresModule } from './stores/stores.module';

import { OrdersModule } from './orders/orders.module';

import { PrismaModule } from './prisma/prisma.module';

import { StorageModule } from './storage/storage.module';

import { FilesModule } from './files/files.module';

import { UploadsModule } from './uploads/uploads.module';

import { PaymentsModule } from './payments/payments.module';

import { PrintingModule } from './printing/printing.module';

import { WebSocketModule } from './websocket/websocket.module';

import { DevicesModule } from './devices/devices.module';

import { NotificationsModule } from './notifications/notifications.module';

import { ShopModule } from './shop/shop.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    HealthModule,
    StoresModule,
    FilesModule,
    UploadsModule,
    OrdersModule,
    PaymentsModule,
    PrintingModule,
    WebSocketModule,
    DevicesModule,
    NotificationsModule,
    ShopModule,
    AuthModule,
  ],
})
export class AppModule {}

