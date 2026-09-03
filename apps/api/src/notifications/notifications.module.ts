import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
