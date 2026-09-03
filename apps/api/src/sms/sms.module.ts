import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

@Module({
  providers: [WhatsAppCloudClient, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
