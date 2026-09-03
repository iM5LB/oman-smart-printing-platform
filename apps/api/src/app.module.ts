import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 100 req / minute. Sensitive routes override with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    LibraryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
