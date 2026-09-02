import { Module, forwardRef } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => WebSocketModule), NotificationsModule],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}
