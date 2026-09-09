import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { TwilioSmsClient } from './twilio-sms.client';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

@Module({
  providers: [TwilioSmsClient, WhatsAppCloudClient, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
