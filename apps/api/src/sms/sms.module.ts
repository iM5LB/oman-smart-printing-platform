import { Module } from '@nestjs/common';
import { OtpBotController } from './otp-bot.controller';
import { SmsService } from './sms.service';
import { TwilioSmsClient } from './twilio-sms.client';
import { WhatsAppBaileysClient } from './whatsapp-baileys.client';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

@Module({
  controllers: [OtpBotController],
  providers: [TwilioSmsClient, WhatsAppCloudClient, WhatsAppBaileysClient, SmsService],
  exports: [SmsService, WhatsAppBaileysClient],
})
export class SmsModule {}
