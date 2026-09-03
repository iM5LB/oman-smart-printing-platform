import { Module, forwardRef } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { DeviceAuthGuard } from './device-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrintingModule } from '../printing/printing.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => PrintingModule)],
  controllers: [ShopController],
  providers: [ShopService, DeviceAuthGuard],
  exports: [ShopService],
})
export class ShopModule {}
